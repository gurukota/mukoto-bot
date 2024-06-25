import { Paynow } from 'paynow';
import dotenv from 'dotenv';
import { setUserState } from '../config/state.js';
import { generateTicket } from './ticket.js';
import { mainMenu, sendDocument, sendImage, sendMessage, sendUrlButton } from '../services/whatasapp/whatsapp.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { send } from 'process';

dotenv.config();

const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID,
  process.env.PAYNOW_INTEGRATION_KEY
);
paynow.resultUrl = 'http://example.com/gateways/paynow/update';
paynow.returnUrl =
  'http://example.com/return?gateway=paynow&merchantReference=1234';

export const processPayment = async (session, userId) => {
  const phone = session.phoneNumber
  const username = session.userName;
  const paymentMethod = session.paymentMethod;
  const eventName = session.event.title;
  const price = parseInt(session.total);
  const email = 'purchases@mukoto.co.zw';
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let replyText = '';   
  
  try {
    const payment = paynow.createPayment(username, email);
    payment.add(eventName, price);
    if (paymentMethod == 'ecocash' || paymentMethod == 'innbucks') {
      const response = await paynow.sendMobile(payment, phone, paymentMethod);
      if (response.success) {
        setUserState(userId, 'paynow');
        let pollUrl = response.pollUrl;
        let transaction = await paynow.pollTransaction(pollUrl);
        let maxRetries = 6;
        let retries = 0;
        let delay = 1000;
        let maxDelay = 60000;
        const backOffFactor = 2;

        if(paymentMethod == 'innbucks') {
          maxRetries = 10;
          maxDelay = 10000;
          const authCode = response.innbucks_info[0].authorizationcode;
          const spacedAuthCode = authCode.toString().replace(/(\d{3})(?=\d)/g, '$1 ');
          const deepLink = response.innbucks_info[0].deep_link_url;

          replyText = 'Use the order below to complete payment via USSD by dialing **569#* ';
          await sendMessage(userId, replyText);
          await sendMessage(userId, `*${spacedAuthCode}*`);

          replyText = `*OR*`;
          await sendMessage(userId, replyText);

          const header = 'InnBucks Mobile';
          const body = 'Tap to open InnBucks mobile application to complete payment.';
          const footer = 'Extra charges may apply.';
          const buttonText = 'Open InnBucks';
          await sendUrlButton(userId, header, body, footer, buttonText , deepLink);


          replyText = '*NOTE:* The transaction window will close in 10 minutes.'
          await sendMessage(userId, replyText);
  
        }
        while (retries < maxRetries) {
          await new Promise((r) => setTimeout(r, delay));
          transaction = await paynow.pollTransaction(pollUrl);
          if (
            transaction.status == 'paid' ||
            transaction.status == 'cancelled'
          ) {
            break;
          }
          retries++;
          delay = Math.min(delay * backOffFactor, maxDelay);
          console.log(delay, retries, transaction.status);
        }
        if (transaction.status == 'paid') {
          replyText = 'Payment successful 🎉🎉🎉';
          await sendMessage(userId, replyText);
          await generateTicket(session, userId);
          for (const ticket of session.pdfList) {
            await sendDocument(
              ticket,
              path.join(__dirname, '..', '..', 'downloads', `${ticket}.pdf`),
              userId
            );
          }
          replyText = 'Thank you for your purchase👊🏽';
          await sendMessage(userId, replyText);
          setUserState(userId, 'menu');
        } else {
          replyText = 'Payment failed, please try again😞';
          await sendMessage(userId, replyText);
          await mainMenu(session.userName, userId);
          setUserState(userId, 'choose_option');
        }
      } else {
        replyText = 'Error initiating payment. Please try again😞';
        await sendMessage(userId, replyText);
        setUserState(userId, 'menu');
      }
    } else {

        const response = await paynow.send(payment);
        if (response.success) {
            let retries = 0;
            let delay = 1000;
            let maxDelay = 60000;
            const backOffFactor = 2;
            const redirectUrl = response.redirectUrl;
            const pollUrl = response.pollUrl;
            let transaction = await paynow.pollTransaction(pollUrl);
            const header = 'Complete Payment';
            const body = 'Tap the button below to see other payment option and complete payment.';
            const footer = 'Extra charges may apply.';
            const buttonText = 'See Payment Options';
            await sendUrlButton(userId, header, body, footer, buttonText , redirectUrl);
            setUserState(userId, 'paynow');

            while (retries <= 6) {
            await new Promise((r) => setTimeout(r, delay));
            transaction = await paynow.pollTransaction(pollUrl);
            if (
                transaction.status == 'paid' ||
                transaction.status == 'cancelled'
            ) {
                break;
            }
            retries++;
            delay = Math.min(delay * backOffFactor, maxDelay);
            }
            if (transaction.status == 'paid') {
            replyText = 'Payment successful 🎉🎉🎉';
            await sendMessage(userId, replyText);
            await generateTicket(session, userId);
            for (const ticket of session.pdfList) {
                await sendDocument(
                ticket,
                path.join(__dirname, '..', '..', 'downloads', `${ticket}.pdf`),
                userId
                );
            }
            replyText = 'Thank you for your purchase👊🏽';
            await sendMessage(userId, replyText);
            setUserState(userId, 'menu');
            } else {
            replyText = 'Payment failed, please try again😞';
            await sendMessage(userId, replyText);
            await mainMenu(session.userName, userId);
            setUserState(userId, 'choose_option');
            }
        } else {
            replyText = 'Error initiating payment. Please try again😞';
            await sendMessage(userId, replyText);
            setUserState(userId, 'menu');
        }
    }
  } catch (error) {
    console.log(error);
  }
};
