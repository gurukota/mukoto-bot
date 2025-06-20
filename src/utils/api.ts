import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { 
  EventCategory, 
  Event, 
  EventResponse, 
  TicketType, 
  Ticket, 
  User, 
  TicketResponse, 
  TicketPurchase 
} from '../types/api.js';

dotenv.config();

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.MUKOTO_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY,
  },
});

export const searchEvents = async (query: string): Promise<Event[]> => {
  try {
    const response = await apiClient.get(`/events/search/${query}`);
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getEvent = async (id: string): Promise<EventResponse | null> => {
  try {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const createTicket = async (data: TicketPurchase): Promise<Ticket | null> => {
  try {
    const response = await apiClient.post(`tickets`, data);
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getTicketTypes = async (eventId: string): Promise<TicketType[]> => {
  try {
    const response = await apiClient.get(`/events/${eventId}/ticket-types`);
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getTicketType = async (id: string): Promise<TicketType | null> => {
  try {
    const response = await apiClient.get(`ticket-types/${id}`);
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getUserByPhone = async (phone: string): Promise<User> => {
  try {
    const response = await apiClient.get(`/phone/${phone}/users`);
    return response.data;
  } catch (error) {
    console.error(error);
    return { can_approve_tickets: false };
  }
};

export const ticketCheckIn = async (qrCode: string): Promise<TicketResponse> => {
  try {
    const response = await apiClient.post(`/tickets/${qrCode}/check_in`);
    return response.data;
  } catch (error) {
    console.error(error);
    return { ticket: null as any, message: 'Error checking in' };
  }
};

export const checkTicketByQRCode = async (qrCode: string): Promise<{ checked_in: boolean }> => {
  try {
    const response = await apiClient.get(`/tickets/${qrCode}/check_ticket`);
    return response.data;
  } catch (error) {
    console.error(error);
    return { checked_in: false };
  }
};

export const getTicketByPhone = async (phone: string): Promise<Ticket[]> => {
  try {
    const response = await apiClient.get(`/phone/${phone}/tickets`);
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getEventCategories = async (): Promise<EventCategory[]> => {
  try {
    const response = await apiClient.get('/categories');
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getEventsByCategory = async (category: string): Promise<Event[]> => {
  try {
    const response = await apiClient.get(`/category/${category}/events`);
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getTicketsByEvent = async (eventId: string): Promise<Ticket[]> => {
  try {
    const response = await apiClient.get(`/events/${eventId}/tickets`);
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};
