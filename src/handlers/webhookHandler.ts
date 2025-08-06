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
import { getUserByPhone } from '../repository/usersDal.js';
import {
  ticketCheckIn,
  checkTicketByQRCode,
} from '../repository/ticketsDal.js';
import { processPayment } from '../utils/payment.js';
import { processFreeRegistration } from '../utils/freeRegistration.js';
import { generateTicket } from '../utils/ticket.js';
import { searchEvents, getEventsByCategory } from '../repository/eventsDal.js';
import { getCategories } from '../repository/categoriesDal.js';
import { getTicketTypes } from '../repository/ticketTypesDal.js';
import { getTicketByPhone } from '../repository/ticketsDal.js';
import {
  CategoryType,
  EventType,
  TicketType,
  TicketTypeType,
} from 'types/index.js';
import { sendCollectionMessage } from '../utils/collectionMessage.js';
import { logger } from '../utils/logger.js';
import { MessageTemplates } from '../utils/messages.js';
import { conversationRecovery } from '../utils/conversationRecovery.js';
import { handleConversationError } from '../utils/errorHandler.js';

export const handleVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    logger.error('Error in handleVerification', { error });
    res.sendStatus(500);
  }
};

export const handleIncomingMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  let userId: string | undefined;
  let lastAction: string | undefined;

  try {
    const data = whatsapp.parseMessage(req.body);
    let replyText = '';

    if (data?.isMessage && data.message) {
      const message = data.message;
      const { from, type, text, button_reply, list_reply } = message;
      const { phone: userPhoneId, name: userName } = from;
      userId = userPhoneId; // Store for error handling
      const userMessage = text?.body;
      const buttonId = button_reply?.id;
      const selectionId = list_reply?.id;
      if (!userMessage && !buttonId && !selectionId) {
        logger.debug('Ignoring non-user message');
        res.sendStatus(200);
        return;
      }

      await setSession(userPhoneId, { userName });

      if (
        typeof userMessage === 'string' &&
        validate(userMessage) &&
        version(userMessage) === 4
      ) {
        const formattedUserId = userPhoneId.replace(/^263/, '0');
        const user = await getUserByPhone(formattedUserId);
        if (user && user.canApproveTickets) {
          const checkTicket = await checkTicketByQRCode(userMessage);
          if (checkTicket) {
            replyText = !checkTicket.checkedIn
              ? MessageTemplates.getTicketCheckInSuccess()
              : MessageTemplates.getTicketAlreadyCheckedIn();
            if (!checkTicket.checkedIn) {
              await ticketCheckIn(userMessage);
            }
          } else {
            replyText = MessageTemplates.getInvalidQRCode();
          }
          await sendMessage(userPhoneId, replyText);
        }
        await setUserState(userPhoneId, 'menu');
      }

      if (!(await getUserState(userPhoneId))) {
        await setUserState(userPhoneId, 'menu');
      }

      const session = await getSession(userPhoneId);
      const userState = await getUserState(userPhoneId);

      // Track last successful action for recovery
      if (userState && userState !== 'menu' && userState !== 'choose_option') {
        lastAction = `${userState}_${type}_${buttonId || selectionId || 'text'}`;
      }

      switch (userState) {
        case 'menu':
          await mainMenu(userName, userPhoneId);
          await setUserState(userPhoneId, 'choose_option');
          break;

        case 'choose_option':
          if (type === 'simple_button_message') {
            switch (buttonId) {
              case '_find_event': {
                replyText = MessageTemplates.getEventDiscoveryPrompt();
                const findEventButtons: SimpleButton[] = [
                  { title: '🔎 Search Events', id: '_event_by_search' },
                  { title: '📂 Browse Categories', id: '_event_by_category' },
                ];
                await sendButtons(userPhoneId, replyText, findEventButtons);
                await setUserState(userPhoneId, 'find_event');
                break;
              }
              case '_view_resend_ticket': {
                const tickets = await getTicketByPhone(userPhoneId);
                await setSession(userPhoneId, { tickets });
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
                    userPhoneId,
                    'event'
                  );
                  await setUserState(userPhoneId, 'resend_ticket');
                } else {
                  replyText = MessageTemplates.getTicketNotFound();
                  await sendMessage(userPhoneId, replyText);
                  await mainMenu(userName, userPhoneId);
                  await setUserState(userPhoneId, 'choose_option');
                }
                break;
              }
              case '_utilities': {
                replyText = MessageTemplates.getUtilityOptions();
                const utilityButtons: SimpleButton[] = [
                  { title: '📍 Event Locations', id: '_event_location' },
                ];
                await sendButtons(userPhoneId, replyText, utilityButtons);
                await setUserState(userPhoneId, 'utilities');
                break;
              }
              default:
                replyText = MessageTemplates.getInvalidOption();
                await sendMessage(userPhoneId, replyText);
                await mainMenu(userName, userPhoneId);
                await setUserState(userPhoneId, 'choose_option');
                break;
            }
          } else {
            replyText = MessageTemplates.getMenuPrompt();
            await sendMessage(userPhoneId, replyText);
            await mainMenu(userName, userPhoneId);
            await setUserState(userPhoneId, 'choose_option');
          }
          break;

        case 'resend_ticket':
          if (type === 'radio_button_message' && selectionId) {
            const tickets = session.tickets?.filter(
              (ticket: TicketType) => ticket.eventId === selectionId
            );
            if (tickets && tickets.length > 0) {
              for (const ticket of tickets) {
                const generatedTicket = await generateTicket(ticket);
                if (generatedTicket) {
                  await sendDocument(
                    generatedTicket.pdfName.toLowerCase(),
                    generatedTicket.pdfUrl,
                    userPhoneId
                  );

                  // Check if ticket delivery method is collection
                  if (ticket.ticketDeliveryMethod === 'collection') {
                    await sendCollectionMessage(userPhoneId, ticket.eventTitle);
                  }
                } else {
                  replyText = 'Tickets not found. Please try again.';
                  await sendMessage(userPhoneId, replyText);
                }
              }
            } else {
              replyText = 'Tickets not found. Please try again.';
              await sendMessage(userPhoneId, replyText);
            }
          } else {
            replyText = 'You have not selected any event. Please try again.';
            await sendMessage(userPhoneId, replyText);
          }
          await mainMenu(userName, userPhoneId);
          await setUserState(userPhoneId, 'choose_option');
          break;

        case 'find_event':
          if (type === 'simple_button_message') {
            if (buttonId === '_event_by_search') {
              replyText = MessageTemplates.getSearchEventPrompt();
              await sendMessage(userPhoneId, replyText);
              await setUserState(userPhoneId, 'search_event');
            } else {
              const eventCategories: CategoryType[] = await getCategories();
              if (eventCategories.length === 0) {
                replyText = MessageTemplates.getCategoryNoEvents();
                await sendMessage(userPhoneId, replyText);
                await mainMenu(userName, userPhoneId);
                await setUserState(userPhoneId, 'choose_option');
              } else {
                await sendRadioButtons(
                  eventCategories,
                  '📂 Event Categories',
                  MessageTemplates.getCategorySelectionPrompt(),
                  'Powered by: Your Address Tech',
                  'Select Category',
                  userPhoneId,
                  'category'
                );
                await setUserState(userPhoneId, 'find_event_by_category');
              }
            }
          } else {
            replyText = MessageTemplates.getMenuPrompt();
            await sendMessage(userPhoneId, replyText);
            await mainMenu(userName, userPhoneId);
          }
          break;

        case 'search_event':
          if (typeof userMessage === 'string') {
            const events: EventType[] = await searchEvents(userMessage);
            if (events.length === 0) {
              replyText = MessageTemplates.getEventSearchResults(0);
              const fallbackButtons: SimpleButton[] = [
                { title: '🔄 Try Again', id: '_find_event' },
                { title: '🏠 Main Menu', id: '_main_menu' },
              ];
              await sendButtons(userPhoneId, replyText, fallbackButtons);
              await setUserState(userPhoneId, 'event_fallback');
            } else {
              const headerText = MessageTemplates.getEventSearchResults(
                events.length
              );
              await sendRadioButtons(
                events,
                '🎉 Search Results',
                headerText,
                'Powered by: Your Address Tech',
                'Select Event',
                userPhoneId,
                'event'
              );
              await setSession(userPhoneId, { events });
              await setUserState(userPhoneId, 'show_event');
            }
          }
          break;

        case 'find_event_by_category':
          if (type === 'radio_button_message' && selectionId) {
            const events: EventType[] = await getEventsByCategory(selectionId);
            if (events.length === 0) {
              replyText = MessageTemplates.getCategoryNoEvents();
              const fallbackButtons: SimpleButton[] = [
                { title: '🔄 Find Events', id: '_find_event' },
                { title: '🏠 Main Menu', id: '_main_menu' },
              ];
              await sendButtons(userPhoneId, replyText, fallbackButtons);
              await setUserState(userPhoneId, 'event_fallback');
            } else {
              await sendRadioButtons(
                events,
                '🎯 Category Events',
                `Here are the available events in this category:`,
                'Powered by: Your Address Tech',
                'Select Event',
                userPhoneId,
                'event'
              );
              await setSession(userPhoneId, { events });
              await setUserState(userPhoneId, 'show_event');
            }
          }
          break;

        case 'show_event':
          if (type === 'radio_button_message' && selectionId) {
            const event = session.events?.find(
              (e: EventType) => e.id === selectionId
            );
            if (event) {
              const formattedDate = moment(event.start).format(
                'dddd, MMMM Do YYYY, h:mm a'
              );
              const eventDetails = MessageTemplates.formatEventDetails(
                event.title,
                event.description || null,
                formattedDate,
                event.location
              );

              if (event.image) {
                await sendImage(userPhoneId, event.image, eventDetails);
                await new Promise(r => setTimeout(r, 2000));
              } else {
                await sendMessage(userPhoneId, eventDetails);
                await new Promise(r => setTimeout(r, 1000));
              }
              await purchaseButtons(userPhoneId, selectionId);
              await setSession(userPhoneId, { event });
              await setUserState(userPhoneId, 'choosen_event_options');
            } else {
              replyText = MessageTemplates.getEventNotFound();
              await sendMessage(userPhoneId, replyText);
              await mainMenu(userName, userPhoneId);
              await setUserState(userPhoneId, 'choose_option');
            }
          } else {
            replyText = MessageTemplates.getSelectionRequired();
            await sendMessage(userPhoneId, replyText);
            await mainMenu(userName, userPhoneId);
            await setUserState(userPhoneId, 'choose_option');
          }
          break;

        case 'choosen_event_options':
          if (type === 'simple_button_message') {
            if (buttonId === '_purchase' && session.event) {
              const ticketTypes: TicketTypeType[] = await getTicketTypes(
                session.event.id
              );
              if (ticketTypes.length > 0) {
                await sendRadioButtons(
                  ticketTypes,
                  '🎟️ Available Tickets',
                  MessageTemplates.getTicketTypeSelection(),
                  'Powered by: Your Address Tech',
                  'Select Ticket Type',
                  userPhoneId,
                  'ticket_type'
                );
                await setUserState(userPhoneId, 'choose_ticket_type');
                await setSession(userPhoneId, { ticketTypes });
              } else {
                replyText = MessageTemplates.getNoTicketTypesAvailable();
                await sendMessage(userPhoneId, replyText);
                await mainMenu(userName, userPhoneId);
                await setUserState(userPhoneId, 'choose_option');
              }
            } else if (buttonId === '_find_event') {
              replyText = MessageTemplates.getEventDiscoveryPrompt();
              const findEventButtons: SimpleButton[] = [
                { title: '🔎 Search Events', id: '_event_by_search' },
                { title: '📂 Browse Categories', id: '_event_by_category' },
              ];
              await sendButtons(userPhoneId, replyText, findEventButtons);
              await setUserState(userPhoneId, 'find_event');
            } else if (buttonId === '_main_menu') {
              await mainMenu(userName, userPhoneId);
              await setUserState(userPhoneId, 'choose_option');
            }
          } else {
            replyText = MessageTemplates.getInvalidOption();
            await sendMessage(userPhoneId, replyText);
            await mainMenu(userName, userPhoneId);
            await setUserState(userPhoneId, 'choose_option');
          }
          break;

        case 'choose_ticket_type':
          if (type === 'radio_button_message' && selectionId) {
            const ticketType = session.ticketTypes?.find(
              (t: TicketTypeType) => t.id === selectionId
            );
            if (ticketType) {
              await setSession(userPhoneId, { ticketType });

              // Check if this is a free ticket (price = 0)
              if (Number(ticketType.price) === 0) {
                replyText = MessageTemplates.getFreeRegistrationConfirmation(
                  ticketType.typeName
                );
                const freeTicketButtons: SimpleButton[] = [
                  { title: '✅ Yes, Register', id: '_free_register' },
                  { title: '❌ Cancel', id: '_cancel_registration' },
                ];
                await sendButtons(userPhoneId, replyText, freeTicketButtons);
                await setUserState(userPhoneId, 'confirm_free_registration');
              } else {
                replyText = MessageTemplates.getTicketQuantityPrompt(
                  ticketType.typeName
                );
                await sendMessage(userPhoneId, replyText);
                await setUserState(userPhoneId, 'enter_ticket_quantity');
              }
            } else {
              replyText = MessageTemplates.getTicketTypeNotFound();
              await sendMessage(userPhoneId, replyText);
              await mainMenu(userName, userPhoneId);
              await setUserState(userPhoneId, 'choose_option');
            }
          } else {
            replyText = MessageTemplates.getSelectionRequired();
            await sendMessage(userPhoneId, replyText);
            await mainMenu(userName, userPhoneId);
            await setUserState(userPhoneId, 'choose_option');
          }
          break;

        case 'confirm_free_registration':
          if (type === 'simple_button_message') {
            if (buttonId === '_free_register') {
              await processFreeRegistration(session, userPhoneId);
            } else if (buttonId === '_cancel_registration') {
              await sendMessage(userPhoneId, '❌ Registration cancelled.');
              await mainMenu(userName, userPhoneId);
              await setUserState(userPhoneId, 'choose_option');
            }
          } else {
            replyText = MessageTemplates.getInvalidOption();
            await sendMessage(userPhoneId, replyText);
            await mainMenu(userName, userPhoneId);
            await setUserState(userPhoneId, 'choose_option');
          }
          break;

        case 'enter_ticket_quantity': {
          const quantity = parseInt(String(userMessage));
          if (isNaN(quantity) || quantity < 1 || quantity > 10) {
            replyText = MessageTemplates.getInvalidQuantityMessage(
              quantity > 10
            );
            await sendMessage(userPhoneId, replyText);
            await setUserState(userPhoneId, 'enter_ticket_quantity');
          } else {
            if (session.ticketType) {
              const total = quantity * Number(session.ticketType.price);
              replyText = MessageTemplates.getPurchaseConfirmation(
                quantity,
                session.ticketType.typeName,
                total,
                session.ticketType.currencyCode
              );
              await paymentMethodButtons(userPhoneId, replyText);
              await setSession(userPhoneId, { total, quantity });
              await setUserState(userPhoneId, 'choose_payment_method');
            }
          }
          break;
        }

        case 'choose_payment_method':
          if (type === 'simple_button_message') {
            const paymentMethod = buttonId?.substring(1); // remove '_'
            await setSession(userPhoneId, { paymentMethod });
            if (paymentMethod === 'web') {
              const phoneNumber = userPhoneId.replace(/^263/, '0');
              await setSession(userPhoneId, { phoneNumber });
              await processPayment(session, userPhoneId);
            } else {
              replyText =
                '📱 *Payment Number*\n\nWhich phone number would you like to use for payment?';
              await paymentNumberButtons(userPhoneId, replyText);
              await setUserState(userPhoneId, 'choose_phone_number');
            }
          }
          break;

        case 'choose_phone_number':
          if (buttonId === '_use_this_number') {
            const phoneNumber = userPhoneId.replace(/^263/, '0');
            await setSession(userPhoneId, { phoneNumber });
            await processPayment(session, userPhoneId);
          } else if (buttonId === '_other_payment_number') {
            replyText = MessageTemplates.getCustomPhonePrompt();
            await sendMessage(userPhoneId, replyText);
            await setUserState(userPhoneId, 'other_phone_number');
          }
          break;

        case 'other_phone_number':
          if (typeof userMessage === 'string') {
            await setSession(userPhoneId, { phoneNumber: userMessage });
            await processPayment(session, userPhoneId);
          }
          break;

        case 'event_fallback':
          if (type === 'simple_button_message') {
            if (buttonId === '_find_event') {
              replyText = MessageTemplates.getSearchEventPrompt();
              await sendMessage(userPhoneId, replyText);
              await setUserState(userPhoneId, 'search_event');
            } else if (buttonId === '_main_menu') {
              await mainMenu(userName, userPhoneId);
              await setUserState(userPhoneId, 'choose_option');
            }
          } else {
            replyText = MessageTemplates.getMenuPrompt();
            await sendMessage(userPhoneId, replyText);
            await mainMenu(userName, userPhoneId);
            await setUserState(userPhoneId, 'choose_option');
          }
          break;

        case 'utilities':
          if (type === 'simple_button_message') {
            const tickets: TicketType[] = await getTicketByPhone(userPhoneId);

            if (tickets.length === 0) {
              replyText = MessageTemplates.getNoTicketsForLocation();
              await sendMessage(userPhoneId, replyText);
              await mainMenu(userName, userPhoneId);
              await setUserState(userPhoneId, 'choose_option');
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
              await setSession(userPhoneId, { tickets });
              await sendRadioButtons(
                events,
                '📍 Event Locations',
                MessageTemplates.getLocationPrompt(),
                'Powered by: Your Address Tech',
                'Select Event',
                userPhoneId,
                'event'
              );
              await setUserState(userPhoneId, 'send_event_location');
            }
          } else {
            replyText = MessageTemplates.getInvalidOption();
            await sendMessage(userPhoneId, replyText);
            await mainMenu(userName, userPhoneId);
            await setUserState(userPhoneId, 'choose_option');
          }
          break;

        case 'send_event_location':
          if (type === 'radio_button_message' && selectionId) {
            const ticket = session.tickets?.find(
              (t: TicketType) => t.eventId === selectionId
            );
            if (
              ticket?.latitude &&
              ticket?.longitude &&
              ticket?.location &&
              ticket?.address
            ) {
              await sendLocation(
                userPhoneId,
                parseFloat(ticket.latitude),
                parseFloat(ticket.longitude),
                ticket.location,
                ticket.address
              );
            } else {
              replyText = MessageTemplates.getEventNotFound();
              await sendMessage(userPhoneId, replyText);
            }
          }
          await mainMenu(userName, userPhoneId);
          await setUserState(userPhoneId, 'choose_option');
          break;

        case 'payment_recovery':
        case 'event_recovery':
        case 'ticket_recovery':
        case 'registration_recovery':
        case 'general_recovery':
        case 'service_recovery':
        case 'error_recovery':
        case 'human_help_offer':
          if (type === 'simple_button_message' && buttonId) {
            const handled = await conversationRecovery.handleRecoveryAction(
              userPhoneId,
              buttonId,
              userState,
              session
            );
            
            if (!handled) {
              // Fallback for unhandled recovery actions
              if (buttonId === '_main_menu') {
                await mainMenu(userName, userPhoneId);
                await setUserState(userPhoneId, 'choose_option');
              } else {
                replyText = MessageTemplates.getInvalidOption();
                await sendMessage(userPhoneId, replyText);
              }
            }
          }
          break;

        case 'collecting_feedback':
          if (typeof userMessage === 'string') {
            // Log feedback for review
            logger.info('User feedback collected', {
              userId: userPhoneId,
              feedback: userMessage,
              timestamp: new Date().toISOString()
            });
            
            await sendMessage(
              userPhoneId,
              "📧 *Thank you for your feedback!*\n\nYour message has been sent to our team. We really appreciate you taking the time to help us improve.\n\nIs there anything else I can help you with today?"
            );
            
            await mainMenu(userName, userPhoneId);
            await setUserState(userPhoneId, 'choose_option');
          }
          break;

        default:
          logger.warn('Unhandled user state', {
            userState,
            userId: userPhoneId,
          });
          await mainMenu(userName, userPhoneId);
          await setUserState(userPhoneId, 'choose_option');
      }
      
      // Clear retry attempts on successful interaction
      conversationRecovery.clearRetryAttempts(userPhoneId);
      
      // Update last successful state for recovery purposes
      if (userState && userState !== 'menu' && !userState.includes('recovery') && !userState.includes('error')) {
        await setSession(userPhoneId, { ...session, lastSuccessfulState: userState });
      }
    } else {
      logger.debug('Not a message');
    }
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error in handleIncomingMessage', { error, userId });

    // Use conversation recovery system for better error handling
    try {
      if (userId) {
        const session = await getSession(userId);
        const userState = await getUserState(userId);
        
        await handleConversationError(
          error instanceof Error ? error : new Error(String(error)),
          userId,
          userState || 'unknown',
          session,
          lastAction
        );
      }
    } catch (recoveryError) {
      logger.error('Recovery system failed, using fallback', {
        recoveryError,
        userId,
      });
      
      // Ultimate fallback - send generic error message
      try {
        if (userId) {
          await sendMessage(userId, MessageTemplates.getGenericError());
        }
      } catch (sendError) {
        logger.error('Failed to send error message to user', {
          sendError,
          userId,
        });
      }
    }

    res.sendStatus(500);
  }
};
