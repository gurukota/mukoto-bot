import { v4 as uuidv4 } from 'uuid';
import {
  mainMenu,
  sendMessage,
  sendDocument,
} from './whatsapp.js';
import { createTicket } from 'repository/ticketsDal.js';
import { generateTicket } from './ticket.js';
import { SessionType } from 'types/index.js';
import { registerForFreeTicket } from '../repository/freeTicketsDal.js';
import { updateEventSoldOutStatus } from './eventStatus.js';
import { setUserState } from '../config/state.js';
import { sendCollectionMessage } from './collectionMessage.js';

/**
 * Process free ticket registration
 */
export const processFreeRegistration = async (
  session: SessionType,
  userId: string
): Promise<void> => {
  try {
    await sendMessage(userId, 'Processing your registration...');

    if (!session.ticketType || !session.event || !session.userName) {
      await sendMessage(
        userId,
        'Registration failed: Missing required information. Please try again.'
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
      await sendMessage(
        userId,
        `Registration failed: ${registrationResult.reason}`
      );
      await mainMenu(session.userName || '', userId);
      setUserState(userId, 'choose_option');
      return;
    }

    // Generate success message
    await sendMessage(userId, '🎉 Registration successful!');
    
    // Generate and send the ticket
    await sendMessage(userId, 'Generating your ticket...');

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
      await sendMessage(
        userId,
        'Your free ticket has been generated! Save this PDF for event entry.'
      );

      // Check if ticket delivery method is collection
      if (session.event.ticketDeliveryMethod === 'collection') {
        await sendCollectionMessage(
          userId,
          session.event.title
        );
      }
    } else {
      await sendMessage(
        userId,
        'Ticket registered successfully, but PDF generation failed. Please contact support.'
      );
    }

    // Update event sold out status after registration
    await updateEventSoldOutStatus(session.event.id);

    await mainMenu(session.userName || '', userId);
    setUserState(userId, 'choose_option');

  } catch (error) {
    console.error('Error processing free registration:', error);
    await sendMessage(
      userId,
      'An error occurred during registration. Please try again.'
    );
    await mainMenu(session.userName || '', userId);
    setUserState(userId, 'choose_option');
  }
};
