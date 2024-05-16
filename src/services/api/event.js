import axios from 'axios';

async function searchEvents(query) {
    const response = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
        params: {
            q: query,
            token: 'YOUR_EVENTBRITE_API_KEY'
        }
    });
    return response.data.events;
}

export { searchEvents };
