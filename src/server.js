import express from 'express';
import bodyParser from 'body-parser';
import { validate, version } from 'uuid';
import {
  sendMessage,
  whatsapp,
  sendDocument,
  mainMenu,
  radioButtons,
  sendImage,
  purchaseButtons,
  eventFallback,
  ticketTypeButton,
  paymentMethodButtons,
  paymentNumberButtons,
} from './services/whatasapp/whatsapp.js';
// import { processMessage } from './services/nlp/intents.js';
import { getUserState, setUserState } from './config/state.js';
import { getSession, setSession } from './config/session.js';
import {
  searchEvents,
  getTicketTypes,
  getTicketType,
  getEvent,
  getUserByPhone,
  ticketCheckIn,
  checkTicketByQRCode,
  getTicketByPhone,
} from './utils/api.js';
import dotenv from 'dotenv';
import { processPayment } from './utils/payment.js';
dotenv.config();
import { generateTicket } from './utils/ticket.js';

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

app.get('/webhook', (req, res) => {
  try {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (
      mode &&
      token &&
      mode === 'subscribe' &&
      token === process.env.WA_VERIFY_TOKEN
    ) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  } catch (error) {
    console.log({ error });
    return res.sendStatus(500);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const data = whatsapp.parseMessage(req.body);
    let replyText = '';
    if (data?.isMessage) {
      const userMessage = data.message.text?.body;
      const userId = data.message.from;
      const userName = data.message.from.name;
      const phone = data.message.from.phone;
      const messageType = data.message.type;
      const buttonId = data.message.button_reply?.id;
      const selectionId = data.message.list_reply?.id;

      setSession(userId, { userName });

      // Check in a ticket
      if (validate(userMessage) && version(userMessage) === 4) {
        const user = await getUserByPhone(phone);
        if (!user.can_approve_tickets) {
          const checkTicket = await checkTicketByQRCode(userMessage);
          if (!checkTicket.checked_in) {
            replyText = `Ticket has been checked in successfully.`;
            const checkIn = await ticketCheckIn(userMessage);
            if (checkIn.ticket) {
              replyText = `Ticket has been checked in successfully.`;
            } else {
              replyText = 'Error checking in. Please try again.';
            }
          } else {
            replyText =
              'Ticket has checked in already. Please purchase another ticker !!!';
          }
          await sendMessage(userId, replyText);
        }
        setUserState(userId, 'ticket_check_in');
      }

      // Initialize user state if not present
      if (!getUserState(userId)) {
        setUserState(userId, 'menu');
      }

      const session = getSession(userId);
      const userState = getUserState(userId);

      console.log({ userState });

      switch (userState) {
        case 'menu':
          await mainMenu(userName, userId);
          setUserState(userId, 'choose_option');
          break;

        case 'choose_option':
          if (messageType == 'simple_button_message') {
            if (buttonId === '_find_event') {
              replyText =
                'Please enter the name or type of event you are interested in:';
              await sendMessage(userId, replyText);
              setUserState(userId, 'find_event');
            } else if (buttonId === '_event_by_category') {
              replyText =
                'Please enter the category of events you are interested in (e.g., Music, Sports, Arts):';
              await sendMessage(userId, replyText);
              setUserState(userId, 'find_event_by_category');
            } else if (buttonId === '_view_resend_ticket') {

              const data = await getTicketByPhone(phone);
              const processedEventIds = new Set();
              const headerText =  `SELECT EVENT 🎉🎉 🎉`;
              const bodyText = `Mukoto 🎅🏿 has lined up some great events for you based on your previous history.\n\nPlease select one of the events below:`;
              const footerText =  'Powered by: Fundasec Security';
              const actionTitle = 'Select an Event';
              
              const eventsArray = [];
              if (data) {
                for (const ticket of data.tickets) {
                  if (!processedEventIds.has(ticket.event_id)) {
                    setUserState(userId, 'paynow');
                    const eventData = await getEvent(ticket.event_id);
                    if (eventData) {
                      eventsArray.push({ event_id: ticket.event_id, title: eventData.event.title });
                    }
                    processedEventIds.add(ticket.event_id);
                  }
                }
                await radioButtons(eventsArray, headerText, bodyText, footerText, actionTitle,  userId);
                setUserState(userId, 'resend_ticket');
              } else {
                replyText = 'Ticket(s) not found. Please try again.';
                setUserState(userId, 'menu');
                
              }
              // setUserState(userId, 'view_or_resend_tickets');
            }
          } else {
            replyText = 'Please choose an option from the menu.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'resend_ticket':
          if (messageType === 'radio_button_message') {
            const data = await getTicketByPhone(phone);
            if (data) {
              for (const ticket of data.tickets) {
                await sendDocument(
                  ticket.name_on_ticket,
                `/Users/halfbae/dev/mukoto-bot/downloads/${ticket.name_on_ticket}.pdf`,
                userId
                );
            }
            } else {
              replyText = 'Tickets not found. Please try again.';
              await sendMessage(userId, replyText);
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            }
            setUserState(userId, 'choosen_event_options');
          } else {
            replyText = 'You have not selected any event. Please try again.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;
        case 'find_event':
          const events = await searchEvents(userMessage);
          if (!events) {
            replyText =
              'No events found for your search. Please try another query.';
            await eventFallback(userId);
            setUserState(userId, 'event_fallback');
          } else {
            const headerText =  `#Special Offers: 🎉🎉 🎉`;
            const bodyText = `Mukoto 🎅🏿 has lined up some great events for you based on your previous history.\n\nPlease select one of the events below:`;
            const footerText =  'Powered by: Fundasec Security';
            const actionTitle = 'Select an Event';
            await radioButtons(events, headerText, bodyText, footerText, actionTitle,  userId);
            setUserState(userId, 'show_event');
          }
          break;

        case 'show_event':
          if (messageType === 'radio_button_message') {
            const { event } = await getEvent(selectionId);
            if (event) {
              let text = `_Title_: *${event.title.trim()}*\n\n\n`;
              text += `_Description_: ${event.title.trim()}\n\n\n`;
              await sendImage(userId, event.image, text);
              await new Promise((r) => setTimeout(r, 2000));
              await purchaseButtons(userId, selectionId);
              setSession(userId, { event });
              setUserState(userId, 'choosen_event_options');
            } else {
              replyText = 'Event not found. Please try again.';
              await sendMessage(userId, replyText);
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            }
            setUserState(userId, 'choosen_event_options');
          }
          break;

        case 'choosen_event_options':
          if (messageType === 'simple_button_message') {
            const ticketTypes = await getTicketTypes(session.event.id);
            if (ticketTypes.length > 0) {
              await ticketTypeButton(userId, ticketTypes);
              setUserState(userId, 'choose_ticket_type');
              setSession(userId, { ticketTypes });
            } else {
              replyText =
                'Error fetching ticket types for this event. Please try again later.';
              await sendMessage(userId, replyText);
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            }
          } else if (buttonId === '_find_event') {
            replyText =
              'Please enter the name or type of event you are interested in:';
            await sendMessage(userId, replyText);
            setUserState(userId, 'find_event');
          } else if (buttonId === '_main_menu') {
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'choose_ticket_type':
          if (messageType === 'simple_button_message') {
            const ticketTypeId = buttonId;
            const ticketType = await getTicketType(
              session.event.id,
              ticketTypeId
            );
            replyText = `You have selected ${ticketType.type_name} ticket. How many tickets do you want to buy?`;
            await sendMessage(userId, replyText);
            setSession(userId, { ticketType });
            setUserState(userId, 'enter_ticket_quantity');
          }
          break;

        case 'enter_ticket_quantity':
          const quantity = parseInt(userMessage);
          const total = quantity * session.ticketType.price;
          replyText = `You have selected ${quantity} tickets of ${session.ticketType.type_name} type. The total cost is $${total} ${session.ticketType.currency_code}. Please confirm payment method.`;
          await paymentMethodButtons(userId, replyText);
          setSession(userId, { quantity });
          setUserState(userId, 'choose_payment_method');
          break;

        case 'choose_payment_method':
          if (messageType === 'simple_button_message') {
            if (buttonId === '_ecocash') {
              replyText = 'Choose a payment number:';
              await paymentNumberButtons(userId, replyText);
              setSession(userId, { paymentMethod: 'ecocash' });
              setUserState(userId, 'choose_phone_number');
            } else if (buttonId === '_other_payment_methods') {
              setSession(userId, { paymentMethod: 'web' });
              await processPayment(session, userId);
            }
          }
          break;

        case 'choose_phone_number':
          if (buttonId == '_use_this_number') {
            let phoneNumber = userId.phone;
            phoneNumber = phoneNumber.replace(/^263/, '0');
            setSession(userId, { phoneNumber });
            await processPayment(session, userId);
          } else if (buttonId == '_other_payment_number') {
            replyText = 'Please enter the desired transact number:';
            await sendMessage(userId, replyText);
            setUserState(userId, 'other_phone_number');
          }
          break;

        case 'other_phone_number':
          let phoneNumber = userMessage;
          setSession(userId, { phoneNumber });
          await processPayment(session, userId);
          break;

        case 'find_event_by_category':
          const categoryEvents = await searchEvents(userMessage);
          if (categoryEvents.length === 0) {
            replyText =
              'No events found for the specified category. Please try another category.';
          } else {
            replyText = 'Here are some events I found in this category:\n';
            categoryEvents.slice(0, 5).forEach((event, index) => {
              replyText += `${index + 1}. ${event.name.text} on ${event.start.local}\n`;
            });
          }
          setUserState(userId, 'menu');
          break;

        case 'view_or_resend_tickets':
          // Placeholder: Implement ticket lookup and resend logic here
          replyText =
            'This feature is under development. Please try again later.';
          setUserState(userId, 'menu');
          break;

        case 'event_fallback':
          if (messageType === 'simple_button_message') {
            if (buttonId === '_find_event') {
              replyText =
                'Please enter the name or type of event you are interested in:';
              await sendMessage(userId, replyText);
              setUserState(userId, 'find_event');
            } else if (buttonId === '_main_menu') {
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            }
          }
          break;

        case 'paynow':
          break;

        case 'ticket_check_in':
          break;

        default:
          await mainMenu(userName, userId);
          setUserState(userId, 'choose_option');
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.log({ error });
    res.sendStatus(500);
  }
});
app.use('*', (req, res) => res.status(404).send('404 Not Found'));
app.listen(3000, () => {
  console.log('Webhook is listening on port 3000');
});
