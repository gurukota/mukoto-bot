export type CategoryType = {
    id: string;
    categoryName: string;
    deleted: boolean;
};

export type EventType = {
    id: string;
    organiserId: string;
    title: string;
    description?: string | null | undefined;
    image?: string | null | undefined;
    start: string;
    end?: string | null | undefined;
    latitude?: string | null | undefined;
    longitude?: string | null | undefined;
    address?: string | null | undefined;
    location: string;
    country: string;
    approveTickets: boolean | null;
    isActive: boolean | null;
    soldOut: boolean |null;
    registrationDeadline?: string | null | undefined;
    deleted: boolean | null; 
    createdBy?: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    organiserName: string;
};

export type TicketType = {
    id: string;
    eventId: string;
    ticketTypeId: string;
    nameOnTicket: string;
    checkedIn: boolean | null;
    qrCode?: string | null | undefined;
    pricePaid: string;
    email: string;
    phone: string;
    deleted: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    paymentStatus: string;
    eventTitle: string;
    eventDescription?: string | null | undefined;
    longitude?: string | null | undefined;
    latitude?: string | null | undefined;
    address?: string | null | undefined;
    location: string;
    eventStart: string;
    eventEnd?: string | null | undefined;
    ticketTypeName: string;
    organiserName: string;
};

export type TicketTypeType = {
    id: string;
    eventId: string;
    typeName: string;
    price: string;
    currencyCode: string;
    description?: string | null | undefined;
    availableQuantity: number;
    deleted: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    splitPercentage?: string | null | undefined;
};

export type SessionType = {

  // User data
  userName?: string;
  phoneNumber?: string;
  
  // Event related
  events?: EventType[];
  event?: EventType;
  
  // Ticket related
  tickets?: TicketType[];
  ticketTypes?: TicketTypeType[];
  ticketType?: TicketTypeType;
  
  // Payment related
  total: number;
  quantity: number;
  paymentMethod: string ;
  
};

