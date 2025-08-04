import { db } from '../db/index.js';
import { events, ticketTypes, tickets } from '../db/schema.js';
import { eq, and, count, sql } from 'drizzle-orm';

/**
 * Check if an event is sold out (considering both paid and free tickets)
 */
export const checkEventSoldOutStatus = async (eventId: string): Promise<boolean> => {
  try {
    // Get all ticket types for the event
    const eventTicketTypes = await db
      .select({
        id: ticketTypes.id,
        availableQuantity: ticketTypes.availableQuantity,
      })
      .from(ticketTypes)
      .where(
        and(
          eq(ticketTypes.eventId, eventId),
          eq(ticketTypes.deleted, false)
        )
      );

    if (eventTicketTypes.length === 0) {
      return true; // No ticket types = sold out
    }

    // Check if all ticket types are sold out
    for (const ticketType of eventTicketTypes) {
      const [registeredCount] = await db
        .select({ count: count() })
        .from(tickets)
        .where(
          and(
            eq(tickets.ticketTypeId, ticketType.id),
            eq(tickets.deleted, false)
          )
        );

      // If any ticket type has remaining quantity, event is not sold out
      if (registeredCount.count < ticketType.availableQuantity) {
        return false;
      }
    }

    return true; // All ticket types are sold out
  } catch (error) {
    console.error('Error checking event sold out status:', error);
    return false; // Default to not sold out on error
  }
};

/**
 * Update event sold out status
 */
export const updateEventSoldOutStatus = async (eventId: string): Promise<void> => {
  try {
    const isSoldOut = await checkEventSoldOutStatus(eventId);
    
    await db
      .update(events)
      .set({ 
        soldOut: isSoldOut,
        updatedAt: new Date()
      })
      .where(eq(events.id, eventId));
  } catch (error) {
    console.error('Error updating event sold out status:', error);
  }
};
