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
  UserType,
} from 'types/index.js';
import { sendCollectionMessage } from '../utils/collectionMessage.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  handleError,
  AppError,
  UnauthorizedError,
  asyncHandler,
} from '../utils/errorHandler.js';
import {
  validatePhoneNumber,
  validateUUID,
  normalizePhoneNumber,
  sanitizeUserInput,
} from '../utils/validation.js';

export const handleVerification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('Webhook verification attempt', {
      mode,
      token: token ? '***' : undefined,
    });

    if (
      mode &&
      token &&
      mode === 'subscribe' &&
      token === config.WA_VERIFY_TOKEN
    ) {
      logger.info('Webhook verification successful');
      res.status(200).send(challenge);
    } else {
      logger.warn('Webhook verification failed', {
        mode,
        token: token ? '***' : undefined,
      });
      throw new UnauthorizedError('Invalid verification token');
    }
  }
);

async function handleTicketCheckIn(
  userId: string,
  qrCode: string
): Promise<void> {
  try {
    const formattedUserId = normalizePhoneNumber(userId);
    const user = await getUserByPhone(formattedUserId);

    if (!user || !user.canApproveTickets) {
      logger.warn('Unauthorized ticket check-in attempt', {
        userId: formattedUserId,
      });
      return;
    }

    const checkTicket = await checkTicketByQRCode(qrCode);
    if (!checkTicket) {
      await sendMessage(userId, 'Invalid ticket QR code. Please try again.');
      return;
    }

    let replyText: string;
    if (!checkTicket.checkedIn) {
      await ticketCheckIn(qrCode);
      replyText = 'Ticket has been checked in successfully.';
      logger.info('Ticket checked in successfully', {
        qrCode,
        userId: formattedUserId,
      });
    } else {
      replyText =
        'Ticket has already been checked in. Please purchase another ticket!';
      logger.info('Attempted to check in already checked ticket', {
        qrCode,
        userId: formattedUserId,
      });
    }

    await sendMessage(userId, replyText);
    await setUserState(userId, 'menu');
  } catch (error) {
    logger.error('Error during ticket check-in', { error, userId, qrCode });
    await sendMessage(userId, 'Error checking in ticket. Please try again.');
  }
}

export const handleIncomingMessage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = whatsapp.parseMessage(req.body);

    if (!data?.isMessage || !data.message) {
      logger.debug('Received non-message webhook');
      res.sendStatus(200);
      return;
    }

    const message = data.message;
    const { from, type, text, button_reply, list_reply } = message;
    const { phone: userId, name: userName } = from;
    const userMessage = text?.body;
    const buttonId = button_reply?.id;
    const selectionId = list_reply?.id;

    // Sanitize inputs
    const sanitizedMessage = userMessage
      ? sanitizeUserInput(userMessage)
      : undefined;
    const sanitizedUserName = userName ? sanitizeUserInput(userName) : 'User';

    if (!sanitizedMessage && !buttonId && !selectionId) {
      logger.debug('Ignoring message with no actionable content', { userId });
      res.sendStatus(200);
      return;
    }

    logger.info('Processing message', {
      userId,
      userName: sanitizedUserName,
      type,
      hasMessage: !!sanitizedMessage,
      hasButton: !!buttonId,
      hasSelection: !!selectionId,
    });

    try {
      await setSession(userId, { userName: sanitizedUserName });

      // Handle QR code ticket check-in
      if (
        sanitizedMessage &&
        validate(sanitizedMessage) &&
        version(sanitizedMessage) === 4
      ) {
        await handleTicketCheckIn(userId, sanitizedMessage);
        res.sendStatus(200);
        return;
      }

      // Initialize user state if not present
      if (!(await getUserState(userId))) {
        await setUserState(userId, 'menu');
      }

      const session = await getSession(userId);
      const userState = await getUserState(userId);

      // Process main message flow based on user state
      let replyText = '';

      switch (userState) {
        case 'menu':
          await mainMenu(sanitizedUserName, userId);
          await setUserState(userId, 'choose_option');
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
                await setUserState(userId, 'find_event');
                break;

              case '_view_resend_ticket':
                const tickets = await getTicketByPhone(userId);
                await setSession(userId, { tickets });

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

                  const headerText = '#Mukoto Events🚀';
                  const bodyText =
                    'Streamlined ticketing, straight to your chat: Mukoto makes events effortless.';
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
                  await setUserState(userId, 'resend_ticket');
                } else {
                  replyText =
                    'No tickets found. Please purchase a ticket first.';
                  await sendMessage(userId, replyText);
                  await setUserState(userId, 'menu');
                }
                break;

              case '_utilities':
                replyText = 'Choose a utility option:';
                const utilityButtons: SimpleButton[] = [
                  { title: 'Event Location', id: '_event_location' },
                ];
                await sendButtons(userId, replyText, utilityButtons);
                await setUserState(userId, 'utilities');
                break;

              default:
                replyText = 'Please choose an option from the menu.';
                await sendMessage(userId, replyText);
                await mainMenu(sanitizedUserName, userId);
                await setUserState(userId, 'choose_option');
            }
          } else {
            replyText = 'Please choose an option from the menu.';
            await sendMessage(userId, replyText);
            await mainMenu(sanitizedUserName, userId);
            await setUserState(userId, 'choose_option');
          }
          break;

        default:
          logger.warn('Unhandled user state', { userState, userId });
          await mainMenu(sanitizedUserName, userId);
          await setUserState(userId, 'choose_option');
      }

      res.sendStatus(200);
    } catch (error) {
      logger.error('Error processing message', {
        error: error instanceof Error ? error.message : error,
        userId,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Send user-friendly error message
      try {
        await sendMessage(
          userId,
          'Sorry, something went wrong. Please try again or contact support.'
        );
      } catch (sendError) {
        logger.error('Failed to send error message to user', { sendError });
      }

      handleError(error instanceof Error ? error : new Error(String(error)));
      res.sendStatus(500);
    }
  }
);
