import { db } from '../db/index.js';
import { tickets } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { Ticket } from '../types/api.js';

export const getTicketByPhone = async (phone: string): Promise<Ticket[]> => {
  try {
    const tickets = await db
      .query.tblTickets.findMany({
        where: eq(tblTickets.phone, phone)
      });
    
    return tickets;
  } catch (error) {
    console.error('Error fetching tickets by phone:', error);
    return [];
  }
};
