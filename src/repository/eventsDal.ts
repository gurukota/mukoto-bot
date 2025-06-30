import { db } from '../db/index.js';
import { events } from '../db/schema.js';
import { ilike, and, eq, or } from 'drizzle-orm';
import type { Event } from '../types/api.js';

export const searchEvents = async (query: string): Promise<Event[]> => {
    try {
        const searchResults = await db
            .select()
            .from(events)
            .where(
                and(
                    or(
                        ilike(events.title, `%${query}%`),
                        ilike(events.description, `%${query}%`)
                    ),
                    eq(events.deleted, false),
                    eq(events.isActive, false)
                )
            );
        console.log('Search results:', searchResults);
        return searchResults;
    } catch (error) {
        console.error('Error searching events:', error);
        return [];
    }
};