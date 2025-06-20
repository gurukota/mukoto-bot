// API response and data models
export interface Event {
  event_id: string;
  title: string;
  description: string;
  event_start: string;
  event_end: string;
  image: string;
  event_location: EventLocation;
}

export interface EventLocation {
  location: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface EventResponse {
  event: Event;
}

export interface EventCategory {
  category_id: string;
  category_name: string;
}

export interface TicketType {
  ticket_type_id: string;
  type_name: string;
  price: number;
  currency_code: string;
}

export interface Ticket {
  event_id: string;
  title: string;
  event_start: string;
  event_end: string;
  name_on_ticket: string;
  checked_in: boolean;
  qr_code: string;
  qr_code_url: string;
  location: {
    name: string;
  };
  ticket_type: string;
  purchaser: {
    full_name: string;
    price_paid: number;
    status: string;
  };
}

export interface User {
  can_approve_tickets: boolean;
}

export interface TicketPurchase {
  event_id: string;
  title: string;
  event_start: string;
  event_end: string;
  name_on_ticket: string;
  checked_in: boolean;
  qr_code: string;
  qr_code_url: string;
  ticket_type_id: string;
  status: string;
  full_name: string;
  price_paid: number;
  total_quantity: number;
  email: string;
  phone: string;
  currency_code: string;
  payment_status: string;
}

export interface TicketResponse {
  ticket: Ticket;
  message?: string;
}
