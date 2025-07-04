import { db } from '../db/index.js';
import { tickets, events, ticketType, organisers } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function getTicketByPhone(phone: string) {
	const result = await db
		.select({
			id: tickets.id,
			eventId: tickets.eventId,
			ticketTypeId: tickets.ticketTypeId,
			nameOnTicket: tickets.nameOnTicket,
			checkedIn: tickets.checkedIn,
			qrCode: tickets.qrCode,
			pricePaid: tickets.pricePaid,
			status: tickets.status,
			email: tickets.email,
			phone: tickets.phone,
			deleted: tickets.deleted,
			createdAt: tickets.createdAt,
			updatedAt: tickets.updatedAt,
			paymentStatus: tickets.paymentStatus,
			eventTitle: events.title,
			eventDescription: events.description,
      longitude: events.longitude,
      latitude: events.latitude,
      address: events.address,
      location: events.location,
      eventStart: events.start,
      eventEnd: events.end,
			ticketTypeName: ticketType.typeName,
			                                 : organisers.name,
		})
		.from(tickets)
		.innerJoin(events, eq(tickets.eventId, events.id))
		.innerJoin(ticketType, eq(tickets.ticketTypeId, ticketType.id))
		.innerJoin(organisers, eq(events.organiserId, organisers.id))
		.where(eq(tickets.phone, phone));
	
	return result;
}

