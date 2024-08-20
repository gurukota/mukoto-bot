import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiClient = axios.create({
  baseURL: process.env.MUKOTO_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY,
  },
});

export const searchEvents = async (query) => {
  try {
    const response = await apiClient.get(`/events/search/${query}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const getEvent = async (id) => {
  try {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const createTicket = async (data) => {
  try {
    const response = await apiClient.post(`tickets`, data);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};


export const getTicketTypes = async (eventId) => {
  try {
    const response = await apiClient.get(`/events/${eventId}/ticket-types`);
    return response.data;
  } catch (error) {
    console.error(error);
  }

}

export const getTicketType = async (id) => {
  try {
    const response = await apiClient.get(`ticket-types/${id}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }

}

export const getUserByPhone = async (phone) => {
  try {
    const response = await apiClient.get(`/phone/${phone}/users`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const ticketCheckIn = async (qrCode) => {
  try {
    const response = await apiClient.post(`/tickets/${qrCode}/check_in`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

export const checkTicketByQRCode = async (qrCode) => {
  try {
    const response = await apiClient.get(`/tickets/${qrCode}/check_ticket`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

export const getTicketByPhone = async (phone) => {
  try {
    const response = await apiClient.get(`/phone/${phone}/tickets`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const getEventsByCategory = async (category) => {
  try {
    const response = await apiClient.get(`/category/${category}/events`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

export const getEventCategories = async () => {
  try {
    const response = await apiClient.get('/categories');
    return response.data;
  } catch (error) {
    console.error(error);
  }
}


export const getTicketsByEvent = async (eventId) => {
  try {
    const response = await apiClient.get(`/events/${eventId}/tickets`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}