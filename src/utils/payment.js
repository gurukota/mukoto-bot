import { Paynow } from 'paynow';
import dotenv from 'dotenv';
import { setUserState } from '../config/state.js';
import { generateTicket } from './ticket.js';
import { mainMenu, sendDocument, sendMessage } from '../services/whatasapp/whatsapp.js';
import path from 'path';
import { fileURLToPath } from 'url';
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
  const phone = '0771111111'; // session.phoneNumber
  const username = userId.name;
  const paymentMethod = session.paymentMethod;
  const eventName = session.event.title;
  const price = parseInt(session.ticketTypes[0].price);
  const email = 'simbarashedixon@gmail.com';
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let replyText = '';   
  
  try {
    const payment = paynow.createPayment(username, email);
    payment.add(eventName, price);
    if (paymentMethod == 'ecocash') {
      const response = await paynow.sendMobile(payment, phone, paymentMethod);
      if (response.success) {
        let pollUrl = response.pollUrl;
        let transaction = await paynow.pollTransaction(pollUrl);
        let retries = 0;
        setUserState(userId, 'paynow');
        while (retries <= 5) {
          await new Promise((r) => setTimeout(r, 8000));

          transaction = await paynow.pollTransaction(pollUrl);
          console.log(transaction.status);
          if (
            transaction.status == 'paid' ||
            transaction.status == 'cancelled'
          ) {
            break;
          }
          retries++;
        }
        if (transaction.status == 'paid') {
          replyText = 'Payment successful';
          await sendMessage(userId, replyText);
          await generateTicket(session, userId);
          for (const ticket of session.pdfList) {
            console.log(path.join(__dirname, '..', '..', 'downloads', `${ticket}.pdf`));
            await sendDocument(
              ticket,
              path.join(__dirname, '..', '..', 'downloads', `${ticket}.pdf`),
              userId
            );
          }
          setUserState(userId, 'menu');
        } else {
          replyText = 'Payment failed, please try again.';
          await sendMessage(userId, replyText);
          await mainMenu(session.userName, userId);
          setUserState(userId, 'choose_option');
        }
      } else {
        replyText = 'Error initiating payment. Please try again.';
        await sendMessage(userId, replyText);
        setUserState(userId, 'menu');
      }
    } else {

        const response = await paynow.send(payment);
        if (response.success) {
            let retries = 0;
            const redirectUrl = response.redirectUrl;
            const pollUrl = response.pollUrl;
            let transaction = await paynow.pollTransaction(pollUrl);
            await sendMessage(userId, 'Visit the following link to complete payment');
            await sendMessage(userId, redirectUrl);
            setUserState(userId, 'paynow');
            while (retries <= 10) {
            await new Promise((r) => setTimeout(r, 8000));
            transaction = await paynow.pollTransaction(pollUrl);
            if (
                transaction.status == 'paid' ||
                transaction.status == 'cancelled'
            ) {
                break;
            }
            retries++;
            }
            if (transaction.status == 'paid') {
            replyText = 'Payment successful';
            await sendMessage(userId, replyText);
            await generateTicket(session, userId);
            for (const ticket of session.pdfList) {
              console.log(                   path.join(__dirname, '..', '..', 'downloads', `${ticket}.pdf`));
                await sendDocument(
                ticket,
                path.join(__dirname, '..', '..', 'downloads', `${ticket}.pdf`),
                userId
                );
            }
            setUserState(userId, 'menu');
            } else {
            replyText = 'Payment failed, please try again.';
            await sendMessage(userId, replyText);
            await mainMenu(session.userName, userId);
            setUserState(userId, 'choose_option');
            }
        } else {
            replyText = 'Error initiating payment. Please try again.';
            await sendMessage(userId, replyText);
            setUserState(userId, 'menu');
        }
    }
  } catch (error) {
    console.log(error);
  }
};
