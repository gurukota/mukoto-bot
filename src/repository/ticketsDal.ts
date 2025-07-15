import { db } from '../db/index.js';
import { tickets, events, ticketTypes, organisers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

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
      ticketTypeName: ticketTypes.typeName,
      organiserName: organisers.name,
    })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
    .innerJoin(organisers, eq(events.organiserId, organisers.id))
    .where(
      and(
        eq(tickets.phone, phone),
        eq(tickets.deleted, false),
        eq(events.deleted, false),
        eq(events.isActive, true),
        eq(organisers.deleted, false),
        eq(events.soldOut, false),
        eq(ticketTypes.deleted, false)
      )
    );

  return result;
}

export async function createTicket(ticketData: any) {
  const result = await db.insert(tickets).values(ticketData).returning();
  console.log(result);
  return result[0] || null;
}

export const checkTicketByQRCode = async (qrCode: string) => {
  const ticket = await db
    .select({
      id: tickets.id,
      checkedIn: tickets.checkedIn,
    })
    .from(tickets)
    .where(eq(tickets.qrCode, qrCode))
    .limit(1);

  return ticket[0] || null;
};

export const ticketCheckIn = async (qrCode: string) => {
  await db
    .update(tickets)
    .set({
      checkedIn: true,
      updatedAt: new Date(),
    })
    .where(eq(tickets.qrCode, qrCode));
};
