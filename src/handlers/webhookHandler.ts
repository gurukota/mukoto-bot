import { Request, Response } from 'express';
import { validate, version } from 'uuid';
import moment from 'moment';

import {
  sendMessage,
  whatsapp,
  sendDocument,
  mainMenu,
  sendRadioButtons,
  sendImage,
  purchaseButtons,
  paymentMethodButtons,
  paymentNumberButtons,
  sendButtons,
  sendLocation,
  SimpleButton,
} from '../utils/whatsapp.js';

import { getUserState, setUserState } from '../config/state.js';
import { getSession, setSession } from '../config/session.js';
import {
  getUserByPhone,
} from '../repository/usersDal.js';
import {
  ticketCheckIn,
  checkTicketByQRCode,
} from '../repository/ticketsDal.js';
import { processPayment } from '../utils/payment.js';
import { generateTicket } from '../utils/ticket.js';
import { searchEvents, getEventsByCategory } from '../repository/eventsDal.js';
import { getCategories } from '../repository/categoriesDal.js';
import { getTicketTypes, } from '../repository/ticketTypesDal.js';
import { getTicketByPhone } from '../repository/ticketsDal.js';
import { CategoryType, EventType, TicketType, TicketTypeType, UserType } from 'types/index.js';

export const handleVerification = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (
      mode &&
      token &&
      mode === 'subscribe' &&
      token === process.env.WA_VERIFY_TOKEN
    ) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } catch (error) {
    console.log({ error });
    res.sendStatus(500);
  }
};

export const handleIncomingMessage = async (req: Request, res: Response) => {
  try {
    const data = whatsapp.parseMessage(req.body);
    let replyText = '';

    if (data?.isMessage && data.message) {
      const message = data.message;
      const { from, type, text, button_reply, list_reply } = message;
      const { phone: userId, name: userName } = from;
      const userMessage = text?.body;
      const buttonId = button_reply?.id;
      const selectionId = list_reply?.id;

      setSession(userId, { userName });

      if (typeof userMessage === 'string' && validate(userMessage) && version(userMessage) === 4) {
        const user = await getUserByPhone(userId);
        if (user && user.canApproveTickets) {
          const checkTicket = await checkTicketByQRCode(userMessage);
          if (checkTicket) {
            replyText = !checkTicket.checkedIn
              ? 'Ticket has been checked in successfully.'
              : 'Ticket has checked in already. Please purchase another ticket!';
            if (!checkTicket.checkedIn) {
              await ticketCheckIn(userMessage);
            }
          } else {
            replyText = 'Invalid ticket QR code. Please try again.';
          }
          await sendMessage(userId, replyText);
        }
        setUserState(userId, 'menu');
      }

      if (!getUserState(userId)) {
        setUserState(userId, 'menu');
      }

      const session = getSession(userId);
      const userState = getUserState(userId);

      switch (userState) {
        case 'menu':
          await mainMenu(userName, userId);
          setUserState(userId, 'choose_option');
          break;

        case 'choose_option':
          if (type === 'simple_button_message') {
            switch (buttonId) {
              case '_find_event':
                replyText = 'Choose how you would like to find an event:';
                const findEventButtons: SimpleButton[] = [
                  { title: 'Find by search', id: '_event_by_search' },
                  { title: 'Find by category', id: '_event_by_category' },
                ];
                await sendButtons(userId, replyText, findEventButtons);
                setUserState(userId, 'find_event');
                break;
              case '_view_resend_ticket':
                const tickets = await getTicketByPhone(userId);
                setSession(userId, { tickets });
                if (tickets.length > 0) {
                  const processedEventIds = new Set<string>();
                  const events = [];
                  for (const ticket of tickets) {
                    if (!processedEventIds.has(ticket.eventId)) {
                      events.push({
                        id: ticket.eventId,
                        title: ticket.eventTitle,
                        description: ticket.eventDescription,
                      });
                      processedEventIds.add(ticket.eventId);
                    }
                  }
                  await sendRadioButtons(
                    events,
                    '#Mukoto Events🚀',
                    'Select an event to get your ticket.',
                    'Powered by: Your Address Tech',
                    'Select Event',
                    userId,
                    'event'
                  );
                  setUserState(userId, 'resend_ticket');
                } else {
                  replyText = 'Ticket(s) not found. Please try again.';
                  await sendMessage(userId, replyText);
                  await mainMenu(userName, userId);
                  setUserState(userId, 'choose_option');
                }
                break;
              case '_utilities':
                replyText = 'Choose a utility option:';
                const utilityButtons: SimpleButton[] = [
                  { title: 'Event Location', id: '_event_location' },
                ];
                await sendButtons(userId, replyText, utilityButtons);
                setUserState(userId, 'utilities');
                break;
              default:
                replyText = 'Please choose an option from the menu.';
                await sendMessage(userId, replyText);
                await mainMenu(userName, userId);
                setUserState(userId, 'choose_option');
                break;
            }
          } else {
            replyText = 'Please choose an option from the menu.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'resend_ticket':
          if (type === 'radio_button_message' && selectionId) {
            const tickets = (session.tickets)?.filter(
              (ticket: TicketType) => ticket.eventId === selectionId
            );
            if (tickets && tickets.length > 0) {
              for (const ticket of tickets) {
                const generatedTicket = await generateTicket(ticket);
                if (generatedTicket) {
                  await sendDocument(
                    generatedTicket.pdfName.toLowerCase(),
                    generatedTicket.pdfFileName,
                    userId
                  );
                } else {
                  replyText = 'Tickets not found. Please try again.';
                  await sendMessage(userId, replyText);
                }
              }
            } else {
              replyText = 'Tickets not found. Please try again.';
              await sendMessage(userId, replyText);
            }
          } else {
            replyText = 'You have not selected any event. Please try again.';
            await sendMessage(userId, replyText);
          }
          await mainMenu(userName, userId);
          setUserState(userId, 'choose_option');
          break;

        case 'find_event':
          if (type === 'simple_button_message') {
            if (buttonId === '_event_by_search') {
              replyText = 'Please enter the name or type of event you are interested in:';
              await sendMessage(userId, replyText);
              setUserState(userId, 'search_event');
            } else {
              const eventCategories: CategoryType[] = await getCategories();
              if (eventCategories.length === 0) {
                replyText = 'No event categories found. Please try again later.';
                await sendMessage(userId, replyText);
                await mainMenu(userName, userId);
                setUserState(userId, 'choose_option');
              } else {
                await sendRadioButtons(
                  eventCategories,
                  '#Mukoto Events🚀',
                  'Select a category to view events.',
                  'Powered by: Your Address Tech',
                  'Select Category',
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
          if (typeof userMessage === 'string') {
            const events: EventType[] = await searchEvents(userMessage);
            if (events.length === 0) {
              replyText = 'No events found for your search. Would you like to try again?';
              const fallbackButtons: SimpleButton[] = [
                { title: 'Yes', id: '_find_event' },
                { title: 'Main Menu', id: '_main_menu' },
              ];
              await sendButtons(userId, replyText, fallbackButtons);
              setUserState(userId, 'event_fallback');
            } else {
              await sendRadioButtons(
                events,
                '#Mukoto Events🚀',
                'Here are the events we found.',
                'Powered by: Your Address Tech',
                'Select Event',
                userId,
                'event'
              );
              setSession(userId, { events });
              setUserState(userId, 'show_event');
            }
          }
          break;

        case 'find_event_by_category':
          if (type === 'radio_button_message' && selectionId) {
            const events: EventType[] = await getEventsByCategory(selectionId);
            if (events.length === 0) {
              replyText = 'No events found for this category. Find another event?';
              const fallbackButtons: SimpleButton[] = [
                { title: 'Yes', id: '_find_event' },
                { title: 'Main Menu', id: '_main_menu' },
              ];
              await sendButtons(userId, replyText, fallbackButtons);
              setUserState(userId, 'event_fallback');
            } else {
              await sendRadioButtons(
                events,
                '#Mukoto Events🚀',
                'Here are the events in this category.',
                'Powered by: Your Address Tech',
                'Select Event',
                userId,
                'event'
              );
              setSession(userId, { events });
              setUserState(userId, 'show_event');
            }
          }
          break;

        case 'show_event':
          if (type === 'radio_button_message' && selectionId) {
            const event = session.events?.find((e: EventType) => e.id === selectionId);
            if (event) {
              const formattedDate = moment(event.start).format(
                'dddd, MMMM Do YYYY, h:mm:ss a'
              );
              let text = `*${event.title.trim()}*\n`;
              text += `${event.description?.trim()}\n`;
              text += `*${formattedDate}*\n`;
              text += `*${event.location}*`;
              if (event.image) {
                await sendImage(userId, event.image, text);
                await new Promise((r) => setTimeout(r, 2000));
              }
              await purchaseButtons(userId, selectionId);
              setSession(userId, { event });
              setUserState(userId, 'choosen_event_options');
            } else {
              replyText = 'Event not found. Please try again.';
              await sendMessage(userId, replyText);
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            }
          } else {
            replyText = 'Select an event from the list. Please try again.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'choosen_event_options':
          if (type === 'simple_button_message') {
            if (buttonId === '_purchase' && session.event) {
              const ticketTypes: TicketTypeType[] = await getTicketTypes(session.event.id);
              if (ticketTypes.length > 0) {
                await sendRadioButtons(
                  ticketTypes,
                  '#Mukoto Events🚀',
                  'Select a ticket type.',
                  'Powered by: Your Address Tech',
                  'Select Ticket Type',
                  userId,
                  'ticket_type'
                );
                setUserState(userId, 'choose_ticket_type');
                setSession(userId, { ticketTypes });
              } else {
                replyText = 'There are no tickets for this event. Please try again later.';
                await sendMessage(userId, replyText);
                await mainMenu(userName, userId);
                setUserState(userId, 'choose_option');
              }
            } else if (buttonId === '_find_event') {
              replyText = 'Choose how you would like to find an event:';
              const findEventButtons: SimpleButton[] = [
                { title: 'Find by search', id: '_event_by_search' },
                { title: 'Find by category', id: '_event_by_category' },
              ];
              await sendButtons(userId, replyText, findEventButtons);
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
          if (type === 'radio_button_message' && selectionId) {
            const ticketType = session.ticketTypes?.find((t: TicketTypeType) => t.id === selectionId);
            if (ticketType) {
              setSession(userId, { ticketType });
              replyText = `You have selected ${ticketType.typeName}. How many tickets do you want to buy?`;
              await sendMessage(userId, replyText);
              setUserState(userId, 'enter_ticket_quantity');
            } else {
              replyText = 'Please select a ticket type. Please try again.';
              await sendMessage(userId, replyText);
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            }
          } else {
            replyText = 'Please select a ticket type. Please try again.';
            await sendMessage(userId, replyText);
            await mainMenu(userName, userId);
            setUserState(userId, 'choose_option');
          }
          break;

        case 'enter_ticket_quantity':
          const quantity = parseInt(String(userMessage));
          if (isNaN(quantity) || quantity < 1 || quantity > 10) {
            replyText = quantity > 10
              ? 'You can only purchase a maximum of 10 tickets. Please try again.'
              : 'Enter a valid number of tickets.';
            await sendMessage(userId, replyText);
            setUserState(userId, 'enter_ticket_quantity');
          } else {
            if (session.ticketType) {
              const total = quantity * Number(session.ticketType.price);
              replyText = `You have selected ${quantity} tickets of ${session.ticketType.typeName} type. The total cost is *$${total} ${session.ticketType.currencyCode}*. *Charges may apply*. Please confirm payment method.`;
              await paymentMethodButtons(userId, replyText);
              setSession(userId, { total, quantity });
              setUserState(userId, 'choose_payment_method');
            }
          }
          break;

        case 'choose_payment_method':
          if (type === 'simple_button_message') {
            const paymentMethod = buttonId?.substring(1); // remove '_'
            setSession(userId, { paymentMethod });
            if (paymentMethod === 'web') {
              const phoneNumber = userId.replace(/^263/, '0');
              setSession(userId, { phoneNumber });
              await processPayment(session, userId);
            } else {
              replyText = 'Choose a payment number:';
              await paymentNumberButtons(userId, replyText);
              setUserState(userId, 'choose_phone_number');
            }
          }
          break;

        case 'choose_phone_number':
          if (buttonId === '_use_this_number') {
            const phoneNumber = userId.replace(/^263/, '0');
            setSession(userId, { phoneNumber });
            await processPayment(session, userId);
          } else if (buttonId === '_other_payment_number') {
            replyText = 'Please enter the desired transact number: for example *0771111111*';
            await sendMessage(userId, replyText);
            setUserState(userId, 'other_phone_number');
          }
          break;

        case 'other_phone_number':
          if (typeof userMessage === 'string') {
            setSession(userId, { phoneNumber: userMessage });
            await processPayment(session, userId);
          }
          break;

        case 'event_fallback':
          if (type === 'simple_button_message') {
            if (buttonId === '_find_event') {
              replyText = 'Please enter the name or type of event you are interested in:';
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
          if (type === 'simple_button_message') {
            const tickets: TicketType[] = await getTicketByPhone(userId);

            if (tickets.length === 0) {
              replyText = 'You have no tickets to view event locations.';
              await sendMessage(userId, replyText);
              await mainMenu(userName, userId);
              setUserState(userId, 'choose_option');
            } else {
              const events = [];
              const processedEventIds = new Set<string>();
              for (const ticket of tickets) {
                if (!processedEventIds.has(ticket.eventId)) {
                  events.push({
                    id: ticket.eventId,
                    title: ticket.eventTitle,
                    description: ticket.eventDescription,
                  });
                  processedEventIds.add(ticket.eventId);
                }
              }
              setSession(userId, { tickets });
              await sendRadioButtons(
                events,
                '#Mukoto Events🚀',
                'Select an event to view its location.',
                'Powered by: Your Address Tech',
                'Select Event',
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
          if (type === 'radio_button_message' && selectionId) {
            const ticket = session.tickets?.find(
              (t: TicketType) => t.eventId === selectionId
            );
            if (ticket?.latitude && ticket?.longitude && ticket?.location && ticket?.address) {
              await sendLocation(
                userId,
                parseFloat(ticket.latitude),
                parseFloat(ticket.longitude),
                ticket.location,
                ticket.address
              );
            } else {
              replyText = 'Event not found. Please try again.';
              await sendMessage(userId, replyText);
            }
          }
          await mainMenu(userName, userId);
          setUserState(userId, 'choose_option');
          break;

        case 'paynow':
          // Silent state
          break;

        default:
          await mainMenu(userName, userId);
          setUserState(userId, 'choose_option');
      }
    } else {
      console.log('Not a message');
    }
    res.sendStatus(200);
  } catch (error) {
    console.log({ error });
    res.sendStatus(500);
  }
};
