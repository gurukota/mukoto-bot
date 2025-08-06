import { Paynow } from 'paynow';
import dotenv from 'dotenv';
import { setUserState, getUserState } from '../config/state.js';
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
import { safePaymentOperation, safeApiCall, safeSendMessage } from './safeOperations.js';
import { PaymentError, NetworkError } from './errorHandler.js';

dotenv.config();

const paynow = new Paynow(
  config.PAYNOW_INTEGRATION_ID,
  config.PAYNOW_INTEGRATION_KEY
);
paynow.resultUrl = 'http://example.com/gateways/paynow/update';
paynow.returnUrl =
  'http://example.com/return?gateway=paynow&merchantReference=1234';

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

export const processPayment = async (
  session: SessionType,
  userId: string
): Promise<void> => {
  // Validate required session data first
  if (!session.event || !session.ticketType || !session.total) {
    logger.error('Missing required payment data', { userId, session });
    throw new PaymentError('Missing payment information. Please start your purchase again.');
  }

  const currentUserState = await getUserState(userId) || 'payment';

  await safePaymentOperation(async () => {
    const phone = session.phoneNumber!;
    const username = session.userName || 'Guest';
    const paymentMethod = session.paymentMethod;
    const eventName = session.event?.title || 'Event Ticket';
    const price = parseInt(String(session.total));
    const email = 'purchases@mukoto.app';

    // Send payment initiation message with error handling
    const messageSent = await safeSendMessage(
      userId,
      `💳 *Initiating Payment*\n\n🎫 Event: ${eventName}\n💰 Amount: ${price} USD\n📱 Method: ${paymentMethod?.toUpperCase()}\n\nPlease wait while we process your payment...`
    );

    if (!messageSent) {
      logger.warn('Failed to send payment initiation message', { userId });
    }

    // Create payment with error handling
    const payment = paynow.createPayment(username, email);
    payment.add(eventName, price);

    let response: PaymentResponse;
    try {
      if (paymentMethod === 'ecocash' || paymentMethod === 'innbucks') {
        response = await paynow.sendMobile(payment, phone, paymentMethod);
      } else {
        response = await paynow.send(payment);
      }
    } catch (error) {
      logger.error('Paynow API error', { error, userId, paymentMethod });
      throw new PaymentError('Payment service is currently unavailable. Please try again later.');
    }

    await handlePaymentResponse(response, session, userId, paymentMethod);
  }, userId, currentUserState, session);
};

const handlePaymentResponse = async (
  response: PaymentResponse,
  session: SessionType,
  userId: string,
  paymentMethod: string
): Promise<void> => {
  if (!response.success) {
    logger.error('Payment initialization failed', { userId, paymentMethod });
    throw new PaymentError('Unable to initialize payment. Please try again or contact support@mukoto.app.');
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
    throw new PaymentError('Payment service error. Please try again or contact support@mukoto.app.');
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
      '⏳ *Payment Pending*\n\nYour payment is still being processed. We\'ll notify you once it\'s complete.\n\nYou can check your ticket status in the main menu.'
    );
    await mainMenu(session.userName || '', userId);
    await setUserState(userId, 'choose_option');
  } else {
    await sendMessage(
      userId,
      '❌ *Payment Failed*\n\nYour payment could not be processed. Please try again or contact support@mukoto.app.'
    );
    await mainMenu(session.userName || '', userId);
    await setUserState(userId, 'choose_option');
  }
};

const handleInnbucksPayment = async (
  response: PaymentResponse,
  userId: string
): Promise<void> => {
  if (response.innbucks_info && response.innbucks_info.length > 0) {
    const authCode = response.innbucks_info[0].authorizationcode;
    const deepLink = response.innbucks_info[0].deep_link_url;

    await sendMessage(
      userId,
      `📱 *InnBucks Payment*\n\n✅ Authorization Code: *${authCode}*\n\n1️⃣ Open your InnBucks app\n2️⃣ Enter the authorization code above\n3️⃣ Confirm the payment\n\nOr tap the link below to open InnBucks directly:`
    );

    await sendUrlButton(
      userId,
      '💳 InnBucks Payment',
      'Complete your payment using InnBucks',
      'Powered by Mukoto Events',
      'Open InnBucks',
      deepLink
    );
  } else {
    throw new PaymentError('InnBucks payment information not available');
  }
};

const handleEcocashPayment = async (
  response: PaymentResponse,
  userId: string
): Promise<void> => {
  await sendMessage(
    userId,
    '📱 *EcoCash Payment*\n\n✅ Payment request sent to your EcoCash number\n\n1️⃣ Check your phone for the EcoCash prompt\n2️⃣ Enter your EcoCash PIN\n3️⃣ Confirm the payment\n\n⏱️ You have 2 minutes to complete this payment.'
  );
};

const handleWebPayment = async (
  response: PaymentResponse,
  userId: string
): Promise<void> => {
  if (response.redirectUrl) {
    await sendMessage(
      userId,
      '💻 *Web Payment*\n\nClick the link below to complete your payment securely:'
    );

    await sendUrlButton(
      userId,
      '💳 Secure Payment',
      'Complete your payment securely',
      'Powered by Mukoto Events',
      'Pay Now',
      response.redirectUrl
    );
  } else {
    throw new PaymentError('Web payment URL not available');
  }
};

const pollTransactionWithRetries = async (
  pollUrl: string,
  paymentMethod: string,
  maxRetries: number = 12,
  intervalMs: number = 10000
): Promise<TransactionStatus> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const status = await paynow.pollTransaction(pollUrl);
      
      if (status.status === 'paid' || status.status === 'cancelled' || status.status === 'failed') {
        return status;
      }
      
      // Continue polling for pending statuses
      if (['pending', 'created', 'sent', 'awaiting delivery'].includes(status.status)) {
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
          continue;
        }
      }
      
      return status;
    } catch (error) {
      logger.error('Error polling transaction', { error, pollUrl, retries });
      
      if (retries === maxRetries - 1) {
        throw new NetworkError('Payment status check timed out');
      }
      
      retries++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  // If we've exhausted retries, return a timeout status
  return { status: 'pending' };
};

const processSuccessfulPayment = async (
  session: SessionType,
  userId: string
): Promise<void> => {
  try {
    const phone = session.phoneNumber!;
    const username = session.userName || 'Guest';

    // Send success message
    await sendMessage(
      userId,
      '🎉 *Payment Successful!*\n\nThank you for your purchase! Your ticket is being generated...'
    );

    // Create ticket
    const ticketData = {
      eventId: session.event!.id,
      ticketTypeId: session.ticketType!.id,
      nameOnTicket: username,
      email: 'purchases@mukoto.app',
      phone: phone,
      pricePaid: String(session.total),
      paymentStatus: 'paid',
    };

    const ticket = await createTicket(ticketData);

    if (ticket) {
      // Generate and send ticket
      const generatedTicket = await generateTicket(ticket);
      if (generatedTicket) {
        await sendDocument(
          generatedTicket.pdfName.toLowerCase(),
          generatedTicket.pdfUrl,
          userId
        );

        // Check if ticket delivery method is collection
        if (session.event?.ticketDeliveryMethod === 'collection') {
          await sendCollectionMessage(userId, session.event.title);
        }

        await sendMessage(userId, MessageTemplates.getTicketSent());
      } else {
        throw new Error('Failed to generate ticket');
      }
    } else {
      throw new Error('Failed to create ticket');
    }

    await mainMenu(username, userId);
    await setUserState(userId, 'choose_option');
  } catch (error) {
    logger.error('Error processing successful payment', { error, userId });
    
    await sendMessage(
      userId,
      '✅ *Payment Received*\n\n⚠️ There was an issue generating your ticket, but your payment was successful. Our team will send your ticket manually within 24 hours.\n\nIf you need immediate assistance, please contact support@mukoto.app.'
    );
    
    await mainMenu(session.userName || 'Guest', userId);
    await setUserState(userId, 'choose_option');
  }
};

export { handlePaymentResponse, processSuccessfulPayment };
