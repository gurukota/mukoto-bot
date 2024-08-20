import { Paynow } from 'paynow';
import dotenv from 'dotenv';
import { setUserState } from '../config/state.js';
import { v4 as uuidv4 } from 'uuid';
import {
  generateQRCode,
  mainMenu,
  sendMessage,
  sendDocument,
  sendUrlButton,
} from '../services/whatasapp/whatsapp.js';
import { createTicket } from './api.js';
import { generateTicket } from './ticket.js';

dotenv.config();

const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID,
  process.env.PAYNOW_INTEGRATION_KEY
);
paynow.resultUrl = 'http://example.com/gateways/paynow/update';
paynow.returnUrl =
  'http://example.com/return?gateway=paynow&merchantReference=1234';


export const processPayment = async (session, userId) => {
  console.log(session);
  const phone = session.phoneNumber;
  const username = session.userName;
  const paymentMethod = session.paymentMethod;
  const eventName = session.event.title;
  const price = parseInt(session.total);
  const email = 'purchases@mukoto.co.zw';

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
    await sendMessage(userId, 'There has been an error. If the payment was successful, please choose the *View Ticket* menu at the main menu to view your ticket. If the payment was not successful, please try again.😞');
    setUserState(userId, 'menu');
  }
};

const handlePaymentResponse = async (
  response,
  session,
  userId,
  paymentMethod
) => {
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
    await mainMenu(session.userName, userId);
    setUserState(userId, 'choose_option');
  }
};

const handleInnbucksPayment = async (response, userId) => {
  console.log(response, userId);
  const authCode = response.innbucks_info[0].authorizationcode;
  const spacedAuthCode = authCode.toString().replace(/(\d{3})(?=\d)/g, '$1 ');
  const deepLink = response.innbucks_info[0].deep_link_url;

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
  await sendUrlButton(userId, header, body, footer, buttonText, deepLink);

  replyText = '*NOTE:* The transaction window will close in 10 minutes.';
  await sendMessage(userId, replyText);
};

const handleWebPayment = async (response, userId) => {
  const header = 'Complete Payment';
  const body =
    'Tap the button below to see other payment option and complete payment.';
  const footer = 'Extra charges may apply.';
  const buttonText = 'See Payment Options';
  await sendUrlButton(userId, header, body, footer, buttonText, response.redirectUrl);
};

const pollTransactionWithRetries = async (pollUrl, paymentMethod) => {
  let retries = 0;
  let delay = 5000;
  const backOffFactor = 2;
  let maxRetries = paymentMethod == 'innbucks' ? 9 : 6;
  let maxDelay = paymentMethod == 'innbucks' ? 600000 : 120000;

  while (retries < maxRetries) {
    await new Promise((r) => setTimeout(r, delay));
    const transaction = await paynow.pollTransaction(pollUrl);
    console.log(transaction.status);
    if (transaction.status == 'paid' || transaction.status == 'cancelled') {
      return transaction;
    }
    retries++;
    delay = Math.min(delay * backOffFactor, maxDelay);
  }
  return { status: 'failed' }; // Default to failed status if max retries exceeded
};

const processTicketPurchase = async (session) => {
  const qrCodeText = uuidv4();
  const randomString = Math.random().toString(36).substring(2, 7);
  const qrCode = await generateQRCode(qrCodeText);
  const ticketData = {
    event_id: session.event.id,
    name_on_ticket: randomString,
    checked_in: false,
    qr_code: qrCodeText,
    qr_code_url: qrCode, // Set the URL of the QR code image if applicable
    ticket_type_id: session.ticketTypes[0].ticket_type_id, // Set the ticket type ID if applicable
    status: 'paid', // Set the status of the ticket if applicable
    full_name: session.userName, // Set the full name of the ticket holder
    price_paid: session.ticketTypes[0].price, // Set the price paid for the ticket if applicable
    total_quantity: session.quantity, // Set the total quantity of tickets if applicable
    email: 'purchases@mukoto.co.zw',
    phone: `263${session.phoneNumber.slice(1)}`, // Set the phone number of the ticket holder
    currency_code: session.ticketTypes[0].currency_code,
    payment_status: 'paid',
  };

  return  createTicket(ticketData);

};

const processSuccessfulPayment = async (session, userId) => {
  await sendMessage(userId, 'Payment successful 🎉🎉🎉');
  await sendMessage(userId, 'Please wait while we process your ticket⏳...');
  for (let i = 0; i < session.quantity; i++) {
    const ticket = await processTicketPurchase(session);
    if (ticket.purchaser.status == 'paid') {
      const generatedPDF = await generateTicket(ticket);
      await sendDocument(
        generatedPDF.pdfName.toLocaleLowerCase(),
        generatedPDF.pdfFileName,
        userId
      );
    } else {
      await sendMessage(
        userId,
        'Error processing ticket, please visit the contact us for assistance😞'
      );
      await mainMenu(session.userName, userId);
      setUserState(userId, 'choose_option');
      break;
    }
  }
  setUserState(userId, 'menu');
};
