import { db } from '../db/index.js';
import { ticketTypes, tickets } from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';

/**
 * Check if a ticket type is free and has available quantity
 */
export const checkFreeTicketAvailability = async (ticketTypeId: string) => {
  try {
    // Get ticket type details
    const ticketType = await db
      .select({
        id: ticketTypes.id,
        typeName: ticketTypes.typeName,
        price: ticketTypes.price,
        availableQuantity: ticketTypes.availableQuantity,
      })
      .from(ticketTypes)
      .where(eq(ticketTypes.id, ticketTypeId))
      .limit(1);

    if (!ticketType[0]) {
      return { available: false, reason: 'Ticket type not found' };
    }

    const ticket = ticketType[0];

    // Check if it's a free ticket (price = '0.00')
    if (ticket.price !== '0.00') {
      return { available: false, reason: 'Not a free ticket' };
    }

    // Count already registered tickets
    const [registeredCount] = await db
      .select({ count: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.ticketTypeId, ticketTypeId),
          eq(tickets.deleted, false)
        )
      );

    const remainingQuantity = ticket.availableQuantity - registeredCount.count;

    return {
      available: remainingQuantity > 0,
      remaining: remainingQuantity,
      total: ticket.availableQuantity,
      ticketType: ticket,
      reason: remainingQuantity <= 0 ? 'Event is sold out' : 'Available'
    };
  } catch (error) {
    console.error('Error checking free ticket availability:', error);
    return { available: false, reason: 'Database error' };
  }
};

/**
 * Register for a free ticket
 */
export const registerForFreeTicket = async (
  ticketTypeId: string,
  userDetails: {
    nameOnTicket: string;
    email: string;
    phone: string;
    eventId: string;
  }
) => {
  try {
    // First check availability
    const availability = await checkFreeTicketAvailability(ticketTypeId);
    
    if (!availability.available) {
      return { success: false, reason: availability.reason };
    }

    // Create the free ticket
    const ticketData = {
      id: crypto.randomUUID(),
      eventId: userDetails.eventId,
      ticketTypeId: ticketTypeId,
      nameOnTicket: userDetails.nameOnTicket,
      paymentStatus: 'free_registration',
      checkedIn: false,
      qrCode: crypto.randomUUID(),
      pricePaid: '0.00',
      email: userDetails.email,
      phone: userDetails.phone,
      deleted: false,
    };

    const result = await db.insert(tickets).values(ticketData).returning();
    
    return { 
      success: true, 
      ticket: result[0],
      remaining: (availability.remaining || 0) - 1 
    };
  } catch (error) {
    console.error('Error registering for free ticket:', error);
    return { success: false, reason: 'Registration failed' };
  }
};

/**
 * Get free ticket types for an event
 */
export const getFreeTicketTypes = async (eventId: string) => {
  try {
    const freeTickets = await db
      .select({
        id: ticketTypes.id,
        typeName: ticketTypes.typeName,
        description: ticketTypes.description,
        availableQuantity: ticketTypes.availableQuantity,
        price: ticketTypes.price,
      })
      .from(ticketTypes)
      .where(
        and(
          eq(ticketTypes.eventId, eventId),
          eq(ticketTypes.price, '0.00'), // Free tickets have price '0.00' (string)
          eq(ticketTypes.deleted, false)
        )
      );

    // Get registration counts for each ticket type
    const ticketsWithCounts = await Promise.all(
      freeTickets.map(async (ticket) => {
        const [registeredCount] = await db
          .select({ count: count() })
          .from(tickets)
          .where(
            and(
              eq(tickets.ticketTypeId, ticket.id),
              eq(tickets.deleted, false)
            )
          );

        return {
          ...ticket,
          registeredCount: registeredCount.count,
          remainingQuantity: ticket.availableQuantity - registeredCount.count,
          isSoldOut: registeredCount.count >= ticket.availableQuantity,
        };
      })
    );

    return ticketsWithCounts;
  } catch (error) {
    console.error('Error fetching free ticket types:', error);
    return [];
  }
};
