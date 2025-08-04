import { db } from '../db/index.js';
import { ticketTypes, tickets } from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';

export const getTicketTypes = async (eventId: string) => {
  try {
    const tticketTypes = await db
      .select()
      .from(ticketTypes)
      .where(
        and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.deleted, false))
      );

    // Add availability information for each ticket type
    const ticketTypesWithAvailability = await Promise.all(
      tticketTypes.map(async (ticketType) => {
        const [registeredCount] = await db
          .select({ count: count() })
          .from(tickets)
          .where(
            and(
              eq(tickets.ticketTypeId, ticketType.id),
              eq(tickets.deleted, false)
            )
          );

        return {
          ...ticketType,
          registeredCount: registeredCount.count,
          remainingQuantity: ticketType.availableQuantity - registeredCount.count,
          isSoldOut: registeredCount.count >= ticketType.availableQuantity,
        };
      })
    );

    return ticketTypesWithAvailability;
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    return [];
  }
};
