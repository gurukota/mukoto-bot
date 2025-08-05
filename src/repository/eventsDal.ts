import { db } from '../db/index.js';
import { events, selectedEventCategories, organisers } from '../db/schema.js';
import { ilike, and, eq, or } from 'drizzle-orm';

export const searchEvents = async (query: string) => {
  try {
    const searchResults = await db
      .select({
        id: events.id,
        organiserId: events.organiserId,
        title: events.title,
        description: events.description,
        image: events.image,
        start: events.start,
        end: events.end,
        latitude: events.latitude,
        longitude: events.longitude,
        address: events.address,
        location: events.location,
        country: events.country,
        approveTickets: events.approveTickets,
        ticketDeliveryMethod: events.ticketDeliveryMethod,
        isActive: events.isActive,
        soldOut: events.soldOut,
        registrationDeadline: events.registrationDeadline,
        deleted: events.deleted,
        createdBy: events.createdBy,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        organiserName: organisers.name,
      })
      .from(events)
      .innerJoin(organisers, eq(events.organiserId, organisers.id))
      .where(
        and(
          or(
            ilike(events.title, `%${query}%`),
            ilike(events.description, `%${query}%`)
          ),
          eq(events.deleted, false),
          eq(events.isActive, true),
          eq(organisers.deleted, false),
          eq(events.soldOut, false)
        )
      );
    return searchResults;
  } catch (error) {
    console.error('Error searching events:', error);
    return [];
  }
};

export const getEventsByCategory = async (categoryId: string) => {
  try {
    const eventsByCategory = await db
      .select({
        id: events.id,
        organiserId: events.organiserId,
        title: events.title,
        description: events.description,
        image: events.image,
        start: events.start,
        end: events.end,
        latitude: events.latitude,
        longitude: events.longitude,
        address: events.address,
        location: events.location,
        country: events.country,
        approveTickets: events.approveTickets,
        ticketDeliveryMethod: events.ticketDeliveryMethod,
        isActive: events.isActive,
        soldOut: events.soldOut,
        registrationDeadline: events.registrationDeadline,
        deleted: events.deleted,
        createdBy: events.createdBy,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        organiserName: organisers.name,
      })
      .from(events)
      .innerJoin(
        selectedEventCategories,
        eq(events.id, selectedEventCategories.eventId)
      )
      .innerJoin(organisers, eq(events.organiserId, organisers.id))
      .where(
        and(
          eq(selectedEventCategories.categoryId, categoryId),
          eq(events.deleted, false),
          eq(events.isActive, true),
          eq(organisers.deleted, false),
          eq(events.soldOut, false)
        )
      );
    console.log(eventsByCategory);

    return eventsByCategory;
  } catch (error) {
    console.error('Error fetching events by category:', error);
    return [];
  }
};
