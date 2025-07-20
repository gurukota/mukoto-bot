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

dotenv.config();

const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID || '',
  process.env.PAYNOW_INTEGRATION_KEY || ''
);
paynow.resultUrl = 'http://example.com/gateways/paynow/update';
paynow.returnUrl =
  'http://example.com/return?gateway=paynow&merchantReference=1234';

export const processPayment = async (
  session: SessionType,
  userId: string
): Promise<void> => {
  const phone = '0771111111'; //session.phoneNumber;
  const username = session.userName || 'Guest';
  const paymentMethod = session.paymentMethod;
  const eventName = session.event?.title || 'Event Ticket';
  const price = parseInt(String(session.total));
  const email = 'simbarashedixon@gmail.com'; //'purchases@mukoto.app';

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
    console.log(error);
    await sendMessage(
      userId,
      'There has been an error. If the payment was successful, please choose the *View Ticket* menu at the main menu to view your ticket. If the payment was not successful, please try again.😞'
    );
    setUserState(userId, 'menu');
  }
};

const handlePaymentResponse = async (
  response: any,
  session: any,
  userId: string,
  paymentMethod: string
): Promise<void> => {
  if (!response.success) {
    await sendMessage(userId, 'Error processing payment. Please try again😞');
    setUserState(userId, 'menu');
    return;
  }
  if (paymentMethod == 'innbucks') {
    await handleInnbucksPayment(response, userId);
  }
  if (paymentMethod == 'web') {
    await handleWebPayment(response, userId);
  }
  setUserState(userId, 'paynow');
  let pollUrl = response.pollUrl;
  let transaction = await pollTransactionWithRetries(pollUrl, paymentMethod);

  if (transaction.status == 'paid') {
    await processSuccessfulPayment(session, userId);
  } else {
    await sendMessage(userId, 'Payment failed, please try again😞');
    await mainMenu(session.userName || '', userId);
    setUserState(userId, 'choose_option');
  }
};

const handleInnbucksPayment = async (
  response: any,
  userId: string
): Promise<void> => {
  const authCode = response.innbucks_info?.[0].authorizationcode;
  const spacedAuthCode = authCode
    ? authCode.toString().replace(/(\d{3})(?=\d)/g, '$1 ')
    : '';
  const deepLink = response.innbucks_info?.[0].deep_link_url;

  let replyText =
    'Use the order below to complete payment via USSD by dialing **569#* ';
  await sendMessage(userId, replyText);
  await sendMessage(userId, `*${spacedAuthCode}*`);

  replyText = `*OR*`;
  await sendMessage(userId, replyText);

  const header = 'InnBucks Mobile';
  const body = 'Tap to open InnBucks mobile application to complete payment.';
  const footer = 'Extra charges may apply.';
  const buttonText = 'Open InnBucks';
  await sendUrlButton(userId, header, body, footer, buttonText, deepLink || '');

  replyText = '*NOTE:* The transaction window will close in 10 minutes.';
  await sendMessage(userId, replyText);
};

const handleWebPayment = async (
  response: any,
  userId: string
): Promise<void> => {
  const header = 'Complete Payment';
  const body =
    'Tap the button below to see other payment option and complete payment.';
  const footer = 'Extra charges may apply.';
  const buttonText = 'See Payment Options';
  await sendUrlButton(
    userId,
    header,
    body,
    footer,
    buttonText,
    response.redirectUrl || ''
  );
};

const pollTransactionWithRetries = async (
  pollUrl: string,
  paymentMethod: string
): Promise<any> => {
  let retries = 0;
  let delay = 5000;
  const backOffFactor = 2;
  let maxRetries = paymentMethod == 'innbucks' ? 9 : 6;
  let maxDelay = paymentMethod == 'innbucks' ? 600000 : 120000;

  while (retries < maxRetries) {
    await new Promise((r) => setTimeout(r, delay));
    const transaction = await paynow.pollTransaction(pollUrl);
    console.log(transaction.status);
    if (transaction.status === 'paid' || transaction.status === 'cancelled') {
      return transaction;
    }
    retries++;
    delay = Math.min(delay * backOffFactor, maxDelay);
  }
  return { status: 'failed' }; // Default to failed status if max retries exceeded
};

const processTicketPurchase = async (session: any) => {
  const qrCodeText = uuidv4();

  if (
    !session.ticketTypes ||
    !session.ticketTypes.length ||
    !session.event ||
    !session.phoneNumber
  ) {
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
    ticketTypeId: session.ticketType.id, // Set the ticket type ID if applicable
    status: 'paid', // Set the status of the ticket if applicable
    fullName: session.userName || '', // Set the full name of the ticket holder
    pricePaid: session.ticketType.price, // Set the price paid for the ticket if applicable
    email: 'purchases@mukoto.app',
    phone: `263${session.phoneNumber.slice(1)}`, // Set the phone number of the ticket holder
    paymentStatus: 'paid',
  };

  return createTicket(ticketData);
};

const processSuccessfulPayment = async (
  session: any,
  userId: string
): Promise<void> => {
  await sendMessage(userId, 'Payment successful 🎉🎉🎉');
  await sendMessage(userId, 'Please wait while we process your ticket⏳...');
  for (let i = 0; i < (session.quantity || 0); i++) {
    const res = await processTicketPurchase(session);
    if (res && res.paymentStatus === 'paid') {
      const ticket = {
        id: res.id,
        eventId: res.eventId,
        ticketTypeId: res.ticketTypeId,
        nameOnTicket: res.nameOnTicket,
        checkedIn: res.checkedIn,
        qrCode: res.qrCode,
        pricePaid: res.pricePaid,
        email: res.email,
        phone: res.phone,
        deleted: res.deleted,
        createdAt: res.createdAt,
        updatedAt: res.updatedAt,
        paymentStatus: res.paymentStatus,
        eventTitle: session.event.title,
        eventDescription: session.event.description,
        longitude: session.event.longitude,
        latitude: session.event.latitude,
        address: session.event.address,
        location: session.event.location,
        eventStart: session.event.start,
        eventEnd: session.event.end,
        ticketTypeName: session.ticketType.typeName,
        organiserName: session.event.organiserName,
      };
      const generatedPDF = await generateTicket(ticket);
      if (generatedPDF) {
        console.log(`Generated PDF: ${generatedPDF.pdfName}`);
        console.log(`PDF: ${generatedPDF.pdfName}`);
        
        
        await sendDocument(
          generatedPDF.pdfName.toLocaleLowerCase(),
          generatedPDF.pdfUrl,
          userId
        );
      }
    } else {
      await sendMessage(
        userId,
        'Error processing ticket, please visit the contact us for assistance😞'
      );
      await mainMenu(session.userName || '', userId);
      setUserState(userId, 'choose_option');
      break;
    }
  }
  setUserState(userId, 'menu');
};
