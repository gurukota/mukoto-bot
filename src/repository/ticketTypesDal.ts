import { db } from '../db/index.js';
import { ticketType } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export const getTicketTypes = async (eventId: string) => {
    try {
        const ticketTypes = await db
            .select()
            .from(ticketType)
            .where(
                and(
                    eq(ticketType.eventId, eventId),
                    eq(ticketType.deleted, false)
                )
            );

        console.log('Fetched ticket types:', ticketTypes);
        
        return ticketTypes;
    } catch (error) {
        console.error('Error fetching ticket types:', error);
        return [];
    }
};
