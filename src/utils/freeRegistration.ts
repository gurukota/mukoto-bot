import { mainMenu, sendMessage, sendDocument } from './whatsapp.js';
import { generateTicket } from './ticket.js';
import { SessionType } from 'types/index.js';
import { registerForFreeTicket } from '../repository/freeTicketsDal.js';
import { updateEventSoldOutStatus } from './eventStatus.js';
import { setUserState } from '../config/state.js';
import { MessageTemplates } from './messages.js';
import { logger } from './logger.js';

/**
 * Process free ticket registration
 */
export const processFreeRegistration = async (
  session: SessionType,
  userId: string
): Promise<void> => {
  try {
    await sendMessage(
      userId,
      '⏳ *Processing Registration*\n\nPlease wait while we register you for this event...'
    );

    if (!session.ticketType || !session.event || !session.userName) {
      logger.error('Free registration failed: Missing session data', {
        userId,
        hasTicketType: !!session.ticketType,
        hasEvent: !!session.event,
        hasUserName: !!session.userName,
      });

      await sendMessage(
        userId,
        '❌ *Registration Failed*\n\nMissing required information. Please start over and try again.'
      );
      await mainMenu(session.userName || '', userId);
      setUserState(userId, 'choose_option');
      return;
    }

    // Register for free ticket
    const registrationResult = await registerForFreeTicket(
      session.ticketType.id,
      {
        nameOnTicket: session.userName,
        email: 'free-registration@mukoto.app',
        phone: userId,
        eventId: session.event.id,
      }
    );

    if (!registrationResult.success || !registrationResult.ticket) {
      logger.warn('Free registration failed', {
        userId,
        reason: registrationResult.reason,
        eventId: session.event.id,
      });

      await sendMessage(
        userId,
        `❌ *Registration Failed*\n\n${registrationResult.reason || 'Unable to process registration'}\n\nPlease try again or contact support.`
      );
      await mainMenu(session.userName || '', userId);
      setUserState(userId, 'choose_option');
      return;
    }

    // Generate success message
    await sendMessage(
      userId,
      MessageTemplates.getRegistrationSuccess(session.event.title)
    );

    // Generate and send the ticket
    await sendMessage(
      userId,
      '📄 *Generating Ticket*\n\nPlease wait while we create your ticket...'
    );

    const ticket = {
      id: registrationResult.ticket.id,
      eventId: registrationResult.ticket.eventId,
      ticketTypeId: registrationResult.ticket.ticketTypeId,
      nameOnTicket: registrationResult.ticket.nameOnTicket,
      checkedIn: registrationResult.ticket.checkedIn,
      qrCode: registrationResult.ticket.qrCode,
      pricePaid: registrationResult.ticket.pricePaid,
      email: registrationResult.ticket.email,
      phone: registrationResult.ticket.phone,
      deleted: registrationResult.ticket.deleted,
      createdAt: registrationResult.ticket.createdAt,
      updatedAt: registrationResult.ticket.updatedAt,
      paymentStatus: registrationResult.ticket.paymentStatus,
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
      await sendDocument(
        generatedPDF.pdfName.toLowerCase(),
        generatedPDF.pdfUrl,
        userId
      );
      await sendMessage(userId, MessageTemplates.getTicketSent());

      // Check if ticket delivery method is collection
      if (session.event.ticketDeliveryMethod === 'collection') {
        await sendMessage(
          userId,
          MessageTemplates.getCollectionReminder(session.event.title)
        );
      }
    } else {
      logger.error('PDF generation failed for free registration', {
        userId,
        ticketId: registrationResult.ticket.id,
        eventId: session.event.id,
      });

      await sendMessage(
        userId,
        '✅ *Registration Successful*\n\n❌ However, ticket PDF generation failed. Your registration is confirmed, but please contact support for your ticket document.'
      );
    }

    // Update event sold out status after registration
    await updateEventSoldOutStatus(session.event.id);

    await mainMenu(session.userName || '', userId);
    setUserState(userId, 'choose_option');
  } catch (error) {
    logger.error('Error processing free registration', {
      error,
      userId,
      eventId: session.event?.id,
      ticketTypeId: session.ticketType?.id,
    });

    await sendMessage(userId, MessageTemplates.getGenericError());
    await mainMenu(session.userName || '', userId);
    setUserState(userId, 'choose_option');
  }
};
