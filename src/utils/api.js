import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiClient = axios.create({
  baseURL: process.env.MUKOTO_API_URL,
  timeout: 10000,
});

export const getEvents = async () => {
    try {
        const response = await apiClient.get('/events');
        return response.data;
    } catch (error) {
        console.error(error);
    }
};

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

export const createTicket = async (data, eventId) => {
  try {
    const response = await apiClient.post(`events/${eventId}/tickets`, data);
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
    // console.error(error);
  }

}

export const getTicketType = async (id, eventId) => {
  try {
    const response = await apiClient.get(`/events/${id}/ticket-types/${eventId}`);
    return response.data;
  } catch (error) {
    // console.error(error);
  }

}

export const getUserByPhone = async (phone) => {
  try {
    const response = await apiClient.get(`/users/phone/${phone}`);
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
    const response = await apiClient.get(`/tickets/${phone}/phone`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

export const getEventsByCategory = async (category) => {
  try {
    const response = await apiClient.get(`/events/category/${category}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

export const getEventCategories = async () => {
  try {
    const response = await apiClient.get('/eventcategories');
    return response.data;
  } catch (error) {
    console.error(error);
  }
}