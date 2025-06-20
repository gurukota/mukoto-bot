// State and session types
import { Event, Ticket, TicketType } from './api.js';

export type UserState = 
  | 'menu'
  | 'choose_option'
  | 'find_event'
  | 'search_event'
  | 'find_event_by_category'
  | 'show_event'
  | 'choosen_event_options'
  | 'choose_ticket_type'
  | 'enter_ticket_quantity'
  | 'choose_payment_method'
  | 'choose_phone_number'
  | 'other_phone_number'
  | 'event_fallback'
  | 'utilities'
  | 'send_event_location'
  | 'paynow'
  | 'resend_ticket';

export interface UserSession {
  userName?: string;
  event?: Event;
  tickets?: Ticket[];
  ticketTypes?: TicketType[];
  ticketType?: TicketType;
  total?: number;
  quantity?: number;
  paymentMethod?: 'ecocash' | 'innbucks' | 'web';
  phoneNumber?: string;
  [key: string]: any;
}
