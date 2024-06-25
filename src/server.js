import express from 'express';
import bodyParser from 'body-parser';
import { validate, version } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment';
import {
  sendMessage,
  whatsapp,
  sendDocument,
  mainMenu,
  sendRadioButtons,
  sendImage,
  purchaseButtons,
  ticketTypeButton,
  paymentMethodButtons,
  paymentNumberButtons,
  sendButtons,
  sendLocation,
} from './services/whatasapp/whatsapp.js';
// import { processMessage } from './services/nlp/intents.js';
import { getUserState, setUserState, userStates } from './config/state.js';
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
  getEventCategories,
  getEventsByCategory,
} from './utils/api.js';
import dotenv from 'dotenv';
import { processPayment } from './utils/payment.js';
dotenv.config();

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
      const userId = data.message.from.phone;
      const userName = data.message.from.name;
      const phone = data.message.from.phone;
      const messageType = data.message.type;
      const buttonId = data.message.button_reply?.id;
      const selectionId = data.message.list_reply?.id;
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      console.log(userId);

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
        setUserState(userId, 'menu');
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
              replyText = 'Choose how you would like to find an event:';
              const listButtons = [
                {
                  title: 'Find by search',
                  id: '_event_by_search',
                },
                {
                  title: 'Find by category',
                  id: '_event_by_category',
                },
              ];
              await sendButtons(userId, replyText, listButtons);
              setUserState(userId, 'find_event');
            } else if (buttonId === '_event_by_category') {
              replyText =
                'Please enter the category of events you are interested in (e.g., Music, Sports, Arts):';
              await sendMessage(userId, replyText);
              setUserState(userId, 'find_event_by_category');
            } else if (buttonId === '_view_resend_ticket') {
              const data = await getTicketByPhone(phone);
              const processedEventIds = new Set();
              const headerText = `#Mukoto Events🚀`;
              const bodyText = `Streamlined ticketing, straight to your chat: Mukoto makes events effortless.`;
              const footerText = 'Powered by: Your Address Tech';
              const actionTitle = 'Select Event';
              const eventsArray = [];
              if (data.tickets.length !== 0) {
                for (const ticket of data.tickets) {
                  if (!processedEventIds.has(ticket.event_id)) {
                    setUserState(userId, 'paynow');
                    const eventData = await getEvent(ticket.event_id);
                    if (eventData) {
                      eventsArray.push({
                        event_id: ticket.event_id,
                        title: eventData.event.title,
                        description: eventData.event.description,
                      });
                    }
                    processedEventIds.add(ticket.event_id);
                  }
                }
                await sendRadioButtons(
                  eventsArray,
                  headerText,
                  bodyText,
                  footerText,
                  actionTitle,
                  userId,
                  'event'
                );
                setUserState(userId, 'resend_ticket');
              } else {
                replyText = 'Ticket(s) not found. Please try again.';
                await sendMessage(userId, replyText);
                setUserState(userId, 'menu');
                setUserState(userId, 'choose_option'); 
              }
              // setUserState(userId, 'view_or_resend_tickets');
            } else if (buttonId === '_utilities') {
              replyText = 'Choose a utility option:';
              const listButtons = [
                {
                  title: 'Event Location',
                  id: '_event_location',
                },
              ];
              await sendButtons(userId, replyText, listButtons);
              setUserState(userId, 'utilities');
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
                  path.join(__dirname, '..', 'downloads', `${ticket.name_on_ticket}.pdf`),
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
          if (messageType == 'simple_button_message') {
            if (buttonId === '_event_by_search') {
              replyText =
                'Please enter the name or type of event you are interested in:';
              await sendMessage(userId, replyText);
              setUserState(userId, 'search_event');
            } else {
              const eventCategories = await getEventCategories();
              if (eventCategories.length === 0) {
                replyText =
                  'No event categories found. Please try again later.';
                await sendMessage(userId, replyText);
                await mainMenu(userName, userId);
                setUserState(userId, 'choose_option');
              } else {
                const headerText = `#Mukoto Events🚀`;
                const bodyText = `Streamlined ticketing, straight to your chat: Mukoto makes events effortless.`;
                const footerText = 'Powered by: Your Address Tech';
                const actionTitle = 'Select Category';
                await sendRadioButtons(
                  eventCategories,
                  headerText,
                  bodyText,
                  footerText,
                  actionTitle,
                  userId,
                  'category'
                );
                setUserState(userId, 'find_event_by_category');
              }
            }
          } else {
            replyText = 'Please choose an option from the menu.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
          }
          break;

        case 'search_event':
          const events = await searchEvents(userMessage);
          if (!events) {
            replyText =
              'No events found for your search. Please try again';
            const listButtons = [
              {
                title: 'Yes',
                id: '_find_event',
              },
              {
                title: 'Main Menu',
                id: '_main_menu',
              },
            ];
            await sendButtons(userId, replyText, listButtons);
            setUserState(userId, 'event_fallback');
          } else {
            const headerText = `#Mukoto Events🚀`;
            const bodyText = `Streamlined ticketing, straight to your chat: Mukoto makes events effortless.`;
            const footerText = 'Powered by: Your Address Tech';
            const actionTitle = 'Select Event';
            await sendRadioButtons(
              events,
              headerText,
              bodyText,
              footerText,
              actionTitle,
              userId,
              'event'
            );
            setUserState(userId, 'show_event');
          }
          break;

        case 'find_event_by_category':
          if (messageType === 'radio_button_message') {
            const events = await getEventsByCategory(selectionId);
            if (events.length === 0) {
              replyText =
                'No events found for this category. Find another event?';
              const listButtons = [
                {
                  title: 'Yes',
                  id: '_find_event',
                },
                {
                  title: 'Main Menu',
                  id: '_main_menu',
                },
              ];
              await sendButtons(userId, replyText, listButtons);
              setUserState(userId, 'event_fallback');
            } else {
              const headerText = `#Mukoto Events🚀`;
              const bodyText = `Streamlined ticketing, straight to your chat: Mukoto makes events effortless.`;
              const footerText = 'Powered by: Your Address Tech';
              const actionTitle = 'Select Event';
              await sendRadioButtons(
                events,
                headerText,
                bodyText,
                footerText,
                actionTitle,
                userId,
                'event'
              );
              setUserState(userId, 'show_event');
            }
          } else {
            replyText = 'Select a category. Please try again.';
            await sendMessage(userId, replyText);
            setUserState(userId, 'menu');
          }
          break;

        case 'show_event':
          if (messageType === 'radio_button_message') {
            const { event } = await getEvent(selectionId);
            if (event) {
              const formattedDate = moment(event.event_start).format('dddd, MMMM Do YYYY, h:mm:ss a');
              let text = `*${event.title.trim()}*\n`;
              text += `*${event.description.trim()}*`;
              text += `\n*${formattedDate}*`;
              text += `\n*${event.event_location.location}*`;
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
          } else {
            replyText = 'Select an event from the list. Please try again.';
            await sendMessage(userId, replyText);
            setUserState(userId, 'menu');
          }
          break;

        case 'choosen_event_options':
          if(messageType === 'simple_button_message'){
            if (buttonId === '_purchase') {
              const ticketTypes = await getTicketTypes(session.event.id);
              if (ticketTypes.length > 0) {
                const headerText = `#Mukoto Events🚀`;
                const bodyText = `Streamlined ticketing, straight to your chat: Mukoto makes events effortless.`;
                const footerText = 'Powered by: Your Address Tech';
                const actionTitle = 'Select Ticket Type';
                await sendRadioButtons(
                  ticketTypes,
                  headerText,
                  bodyText,
                  footerText,
                  actionTitle,
                  userId,
                  'ticket_type'
                );
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
          } else {
            replyText = 'Choose a valid option. Please try again.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'choose_ticket_type':
          if (messageType === 'radio_button_message') {
            const ticketTypeId = selectionId;
            const ticketType = await getTicketType(
              session.event.id,
              ticketTypeId
            );
            replyText = `You have selected ${ticketType.type_name} ticket. How many tickets do you want to buy?`;
            await sendMessage(userId, replyText);
            setSession(userId, { ticketType });
            setUserState(userId, 'enter_ticket_quantity');
          } else {
            replyText = 'Please select a ticket type. Please try again.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'enter_ticket_quantity':
          const quantity = parseInt(userMessage);
          if (isNaN(quantity) || quantity < 1 || quantity > 10) {
            if(quantity > 10){
              replyText = 'You can only purchase a maximum of 10 tickets. Please try again.';
              await sendMessage(userId, replyText);
            } else {
              replyText = 'Enter a valid number of tickets. Please try again.';
              await sendMessage(userId, replyText);
            }

            replyText = `You have selected ${ticketType.type_name} ticket. How many tickets do you want to buy?`;
            await sendMessage(userId, replyText);
            setUserState(userId, 'enter_ticket_quantity');
          }
          const total = quantity * session.ticketType.price;
          replyText = `You have selected ${quantity} tickets of ${session.ticketType.type_name} type. The total cost is *$${total} ${session.ticketType.currency_code}*. Please confirm payment method.`;
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
            const phoneNumber = userId;
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
          const phoneNumber = userMessage;
          setSession(userId, { phoneNumber });
          await processPayment(session, userId);
          break;

        case 'event_fallback':
          if (messageType === 'simple_button_message') {
            if (buttonId === '_find_event') {
              replyText =
                'Please enter the name or type of event you are interested in:';
              await sendMessage(userId, replyText);
              setUserState(userId, 'search_event');
            } else if (buttonId === '_main_menu') {
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            }
          } else {
            replyText = 'Please choose an option from the menu.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'utilities':
          if (messageType === 'simple_button_message') {
            const { tickets } = await getTicketByPhone(phone);
            console.log(tickets);
            if (tickets.length == 0) {
              replyText = 'You have no tickets to view event locations.';
              await sendMessage(userId, replyText);
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            } else {
              const headerText = `#Mukoto Events🚀`;
              const bodyText = `Streamlined ticketing, straight to your chat: Mukoto makes events effortless.`;
              const footerText = 'Powered by: Your Address Tech';
              const actionTitle = 'Select Event';
              const events = [];
              const processedEventIds = new Set();
              for (const ticket of tickets) {
                if (!processedEventIds.has(ticket.event_id)) {
                  setUserState(userId, 'paynow');
                  const eventData = await getEvent(ticket.event_id);
                  if (eventData.event.length !== 0) {
                    events.push({
                      event_id: ticket.event_id,
                      title: eventData.event.title,
                      description: eventData.event.description,
                    });
                  }
                  processedEventIds.add(ticket.event_id);
                }
              }
              await sendRadioButtons(
                events,
                headerText,
                bodyText,
                footerText,
                actionTitle,
                userId,
                'event'
              );
              setUserState(userId, 'send_event_location');
            }
          } else {
            replyText = 'Select a valid option. Please try again.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'send_event_location':
          if (messageType === 'radio_button_message') {
            const {event} = await getEvent(selectionId);
            console.log(event);
            if (event) {
              await sendLocation(userId, event.event_location.latitude, event.event_location.longitude, event.event_location.location, event.event_location.address);
            } else {
              replyText = 'Event not found. Please try again.';
              await sendMessage(userId, replyText);
              await mainMenu(userName, userId);
              setUserState(userId, 'menu');
            }
          } else {
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'paynow':
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
app.listen(5000, () => {
  console.log('Webhook is listening on port 5000');
});
