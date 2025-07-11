import { db } from '../db/index.js';
import { ticketTypes } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const getTicketTypes = async (eventId: string) => {
    try {
        const tticketTypes = await db
            .select()
            .from(ticketTypes)
            .where(
                and(
                    eq(ticketTypes.eventId, eventId),
                    eq(ticketTypes.deleted, false)
                )
            );
        return tticketTypes;
    } catch (error) {
        console.error('Error fetching ticket types:', error);
        return [];
    }
};
