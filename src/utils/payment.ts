import { Paynow } from 'paynow';
import dotenv from 'dotenv';
import { setUserState } from '../config/state.js';
import { v4 as uuidv4 } from 'uuid';
import {
  mainMenu,
  sendMessage,
  sendDocument,
  sendUrlButton,
} from './whatsapp.js';
import { createTicket } from 'repository/ticketsDal.js';
import { generateTicket } from './ticket.js';
import { SessionType } from 'types/index.js';
import { sendCollectionMessage } from './collectionMessage.js';
import { MessageTemplates } from './messages.js';
import { logger } from './logger.js';
import { config } from '../config/env.js';

dotenv.config();

const paynow = new Paynow(
  config.PAYNOW_INTEGRATION_ID,
  config.PAYNOW_INTEGRATION_KEY
);
paynow.resultUrl = 'http://example.com/gateways/paynow/update';
paynow.returnUrl =
  'http://example.com/return?gateway=paynow&merchantReference=1234';

export const processPayment = async (
  session: SessionType,
  userId: string
): Promise<void> => {
  const phone = session.phoneNumber!;
  const username = session.userName || 'Guest';
  const paymentMethod = session.paymentMethod;
  const eventName = session.event?.title || 'Event Ticket';
  const price = parseInt(String(session.total));
  const email = 'purchases@mukoto.app';

  // Validate required session data
  if (!session.event || !session.ticketType || !session.total) {
    logger.error('Missing required payment data', { userId, session });
    await sendMessage(userId, MessageTemplates.getGenericError());
    await mainMenu(username, userId);
    await setUserState(userId, 'choose_option');
    return;
  }

  // Send payment initiation message
  await sendMessage(
    userId,
    `💳 *Initiating Payment*\n\n🎫 Event: ${eventName}\n💰 Amount: ${price} USD\n📱 Method: ${paymentMethod?.toUpperCase()}\n\nPlease wait while we process your payment...`
  );

  try {
    const payment = paynow.createPayment(username, email);
    payment.add(eventName, price);

    let response;
    if (paymentMethod === 'ecocash' || paymentMethod === 'innbucks') {
      response = await paynow.sendMobile(payment, phone, paymentMethod);
    } else {
      response = await paynow.send(payment);
    }

    await handlePaymentResponse(response, session, userId, paymentMethod);
  } catch (error) {
    logger.error('Payment processing error', {
      error,
      userId,
      eventName,
      price,
    });

    await sendMessage(
      userId,
      `❌ *Payment Error*\n\nWe encountered an issue processing your payment. Please try again.\n\nIf you believe the payment went through, you can check your tickets using the "🎫 My Tickets" option in the main menu.`
    );

    await mainMenu(username, userId);
    await setUserState(userId, 'choose_option');
  }
};

interface PaymentResponse {
  success: boolean;
  pollUrl?: string;
  redirectUrl?: string;
  innbucks_info?: Array<{
    authorizationcode: string;
    deep_link_url: string;
  }>;
}

interface TransactionStatus {
  status:
    | 'paid'
    | 'cancelled'
    | 'failed'
    | 'pending'
    | 'created'
    | 'sent'
    | 'awaiting delivery';
}

const handlePaymentResponse = async (
  response: PaymentResponse,
  session: SessionType,
  userId: string,
  paymentMethod: string
): Promise<void> => {
  if (!response.success) {
    logger.error('Payment initialization failed', { userId, paymentMethod });
    await sendMessage(
      userId,
      '❌ *Payment Failed*\n\nUnable to initialize payment. Please try again or contact support.'
    );
    await mainMenu(session.userName || '', userId);
    await setUserState(userId, 'choose_option');
    return;
  }

  // Handle different payment methods
  if (paymentMethod === 'innbucks') {
    await handleInnbucksPayment(response, userId);
  } else if (paymentMethod === 'ecocash') {
    await handleEcocashPayment(response, userId);
  } else if (paymentMethod === 'web') {
    await handleWebPayment(response, userId);
  }

  await setUserState(userId, 'paynow');

  const pollUrl = response.pollUrl;
  if (!pollUrl) {
    logger.error('No poll URL provided', { userId, paymentMethod });
    await sendMessage(userId, MessageTemplates.getGenericError());
    return;
  }

  const transaction = await pollTransactionWithRetries(pollUrl, paymentMethod);

  if (transaction.status === 'paid') {
    await processSuccessfulPayment(session, userId);
  } else if (transaction.status === 'cancelled') {
    await sendMessage(
      userId,
      '❌ *Payment Cancelled*\n\nYour payment was cancelled. No charges were made.\n\nWould you like to try again or return to the main menu?'
    );
    await mainMenu(session.userName || '', userId);
    await setUserState(userId, 'choose_option');
  } else if (
    transaction.status === 'created' ||
    transaction.status === 'sent' ||
    transaction.status === 'awaiting delivery'
  ) {
    await sendMessage(
      userId,
      '⏳ *Payment Pending*\n\nYour payment is still being processed. This may take a few minutes.\n\nIf payment is successful, your tickets will be sent automatically. You can also check your tickets later using the "🎫 My Tickets" option.'
    );
    await mainMenu(session.userName || '', userId);
    await setUserState(userId, 'choose_option');
  } else {
    await sendMessage(
      userId,
      '❌ *Payment Failed*\n\nYour payment could not be processed. Please check your account balance and try again.\n\nIf you continue to experience issues, please contact your mobile money provider.'
    );
    await mainMenu(session.userName || '', userId);
    await setUserState(userId, 'choose_option');
  }
};

const handleInnbucksPayment = async (
  response: PaymentResponse,
  userId: string
): Promise<void> => {
  const authCode = response.innbucks_info?.[0]?.authorizationcode;
  const spacedAuthCode = authCode
    ? authCode.toString().replace(/(\d{3})(?=\d)/g, '$1 ')
    : '';
  const deepLink = response.innbucks_info?.[0]?.deep_link_url;

  await sendMessage(
    userId,
    `🏦 *InnBucks Payment*\n\n*Option 1: USSD*\nDial *569# and use this authorization code:\n\n*${spacedAuthCode}*\n\n*OR*\n\n*Option 2: Mobile App*\nTap the button below to open InnBucks app:`
  );

  if (deepLink) {
    const header = '📱 InnBucks Mobile';
    const body = 'Complete your payment using the InnBucks mobile application.';
    const footer = '⚠️ Transaction expires in 10 minutes';
    const buttonText = 'Open InnBucks App';
    await sendUrlButton(userId, header, body, footer, buttonText, deepLink);
  }

  await sendMessage(
    userId,
    "⏰ *Important:* You have 10 minutes to complete this payment. We'll notify you once the payment is confirmed."
  );
};

const handleEcocashPayment = async (
  response: PaymentResponse,
  userId: string
): Promise<void> => {
  await sendMessage(
    userId,
    `📱 *EcoCash Payment Initiated*\n\nPlease check your phone for the EcoCash payment prompt and follow the instructions to complete your payment.\n\n⏰ You have 5 minutes to complete this transaction.\n\nWe'll notify you once payment is confirmed.`
  );
};

const handleWebPayment = async (
  response: PaymentResponse,
  userId: string
): Promise<void> => {
  const header = '💳 Complete Payment';
  const body =
    'Tap the button below to view payment options and complete your transaction securely.';
  const footer = '🔒 Secure payment powered by Paynow';
  const buttonText = 'View Payment Options';

  await sendUrlButton(
    userId,
    header,
    body,
    footer,
    buttonText,
    response.redirectUrl || ''
  );

  await sendMessage(
    userId,
    "⏰ *Payment Window:* You have 15 minutes to complete your payment. We'll automatically check for confirmation."
  );
};

const pollTransactionWithRetries = async (
  pollUrl: string,
  paymentMethod: string
): Promise<TransactionStatus> => {
  let retries = 0;
  let delay = 5000;
  const backOffFactor = 2;
  const maxRetries = paymentMethod === 'innbucks' ? 9 : 6;
  const maxDelay = paymentMethod === 'innbucks' ? 600000 : 120000;

  while (retries < maxRetries) {
    await new Promise(r => setTimeout(r, delay));

    try {
      const transaction = await paynow.pollTransaction(pollUrl);
      logger.debug('Transaction status check', {
        status: transaction.status,
        retries,
        paymentMethod,
      });

      // Return immediately for final statuses
      if (
        transaction.status === 'paid' ||
        transaction.status === 'cancelled' ||
        transaction.status === 'failed'
      ) {
        return transaction;
      }

      // Continue polling for intermediate statuses
      if (
        transaction.status === 'created' ||
        transaction.status === 'sent' ||
        transaction.status === 'awaiting delivery'
      ) {
        logger.debug('Payment still processing', {
          status: transaction.status,
          retries,
        });
      }
    } catch (error) {
      logger.error('Error polling transaction', { error, retries, pollUrl });
    }

    retries++;
    delay = Math.min(delay * backOffFactor, maxDelay);
  }

  // If we've exhausted retries, return the last known status or default to failed
  return { status: 'awaiting delivery' }; // More accurate than 'failed' since payment might still be processing
};

interface TicketCreationResult {
  id: string;
  eventId: string;
  ticketTypeId: string;
  nameOnTicket: string;
  checkedIn: boolean | null;
  qrCode: string | null;
  pricePaid: string;
  email: string;
  phone: string;
  deleted: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  paymentStatus: string;
}

const processTicketPurchase = async (
  session: SessionType
): Promise<TicketCreationResult | null> => {
  const qrCodeText = uuidv4();

  if (!session.ticketType || !session.event || !session.phoneNumber) {
    logger.error('Missing required session data for ticket purchase', {
      session,
    });
    return null;
  }

  const ticketData = {
    id: uuidv4(),
    eventId: session.event.id,
    title: session.event.title,
    eventStart: session.event.start,
    eventEnd: session.event.end,
    nameOnTicket: session.userName,
    qrCode: qrCodeText,
    ticketTypeId: session.ticketType.id,
    status: 'paid',
    fullName: session.userName || '',
    pricePaid: session.ticketType.price,
    email: 'purchases@mukoto.app',
    phone: `263${session.phoneNumber.slice(1)}`,
    paymentStatus: 'paid',
  };

  return createTicket(ticketData);
};

const processSuccessfulPayment = async (
  session: SessionType,
  userId: string
): Promise<void> => {
  const eventTitle = session.event?.title || 'Event';
  const quantity = session.quantity || 1;

  // Send success message
  await sendMessage(
    userId,
    `🎉 *Payment Successful!*\n\n✅ Your payment has been confirmed.\n🎫 Generating ${quantity} ticket${quantity > 1 ? 's' : ''} for *${eventTitle}*...\n\nPlease wait a moment while we prepare your tickets.`
  );

  let successfulTickets = 0;
  const generatedTickets: { pdfName: string; pdfUrl: string }[] = [];

  // Process all tickets first without sending them
  for (let i = 0; i < quantity; i++) {
    try {
      const ticketResult = await processTicketPurchase(session);

      if (ticketResult && ticketResult.paymentStatus === 'paid') {
        const ticket = {
          id: ticketResult.id,
          eventId: ticketResult.eventId,
          ticketTypeId: ticketResult.ticketTypeId,
          nameOnTicket: ticketResult.nameOnTicket,
          checkedIn: ticketResult.checkedIn,
          qrCode: ticketResult.qrCode,
          pricePaid: ticketResult.pricePaid,
          email: ticketResult.email,
          phone: ticketResult.phone,
          deleted: ticketResult.deleted,
          createdAt: ticketResult.createdAt,
          updatedAt: ticketResult.updatedAt,
          paymentStatus: ticketResult.paymentStatus,
          eventTitle: session.event!.title,
          eventDescription: session.event!.description,
          longitude: session.event!.longitude,
          latitude: session.event!.latitude,
          address: session.event!.address,
          location: session.event!.location,
          eventStart: session.event!.start,
          eventEnd: session.event!.end,
          ticketTypeName: session.ticketType!.typeName,
          organiserName: session.event!.organiserName,
        };

        const generatedPDF = await generateTicket(ticket);
        if (generatedPDF) {
          logger.info('Ticket PDF generated successfully', {
            userId,
            ticketId: ticket.id,
            pdfName: generatedPDF.pdfName,
          });

          generatedTickets.push(generatedPDF);
          successfulTickets++;
        } else {
          logger.error('Failed to generate ticket PDF', {
            userId,
            ticketId: ticket.id,
          });
        }
      }
    } catch (error) {
      logger.error('Error processing individual ticket', {
        error,
        userId,
        ticketIndex: i,
      });
    }
  }

  // Now send results and tickets based on success
  if (successfulTickets === quantity) {
    // All tickets successful
    await sendMessage(
      userId,
      `✅ *All Tickets Ready!*\n\n🎫 Successfully generated ${successfulTickets} ticket${successfulTickets > 1 ? 's' : ''} for *${eventTitle}*!\n\n📱 Your ticket${successfulTickets > 1 ? 's are' : ' is'} being sent now...`
    );

    // Send all tickets
    for (const pdf of generatedTickets) {
      await sendDocument(pdf.pdfName.toLowerCase(), pdf.pdfUrl, userId);
    }

    // Send final message with collection info if needed
    if (session.event?.ticketDeliveryMethod === 'collection') {
      await sendCollectionMessage(userId, session.event.title);
    } else {
      await sendMessage(
        userId,
        `🎉 *You're All Set!*\n\nYour ticket${successfulTickets > 1 ? 's have' : ' has'} been delivered. Save ${successfulTickets > 1 ? 'them' : 'it'} to your device and bring ${successfulTickets > 1 ? 'them' : 'it'} to the event.\n\nThank you for using Mukoto! 🚀`
      );
    }
  } else if (successfulTickets > 0) {
    // Partial success
    await sendMessage(
      userId,
      `⚠️ *Partial Success*\n\n✅ ${successfulTickets} of ${quantity} tickets generated successfully.\n❌ ${quantity - successfulTickets} ticket${quantity - successfulTickets > 1 ? 's' : ''} failed to generate.\n\n📱 Sending your successful ticket${successfulTickets > 1 ? 's' : ''}...`
    );

    // Send successful tickets
    for (const pdf of generatedTickets) {
      await sendDocument(pdf.pdfName.toLowerCase(), pdf.pdfUrl, userId);
    }

    // Send collection message if required and final instructions
    if (session.event?.ticketDeliveryMethod === 'collection') {
      await sendCollectionMessage(userId, session.event.title);
    }

    await sendMessage(
      userId,
      '📞 *Next Steps:* Please contact support for assistance with the missing tickets using the contact information in your ticket.'
    );
  } else {
    // Complete failure
    await sendMessage(
      userId,
      '❌ *Ticket Generation Failed*\n\nYour payment was successful, but we encountered an issue generating your tickets. Please contact support with your payment confirmation.'
    );
  }

  await setUserState(userId, 'menu');
};
