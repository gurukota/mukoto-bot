import express from 'express';
import bodyParser from 'body-parser';
import { sendMessage } from './services/whatasapp/whatsapp.js';
// import { processMessage } from './services/nlp/intents.js';
import { userStates, getUserState, setUserState } from './config/state.js';
import { searchEvents } from './services/api/event.js';
import dotenv from 'dotenv';
dotenv.config();


const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));


app.get('/webhook', (req, res) => {
    try {
        console.log('Someone is trying to verify the webhook');

        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];

        if(mode && token && mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    } catch (error) {
        console.log({error});
        return res.sendStatus(500);
    }
});

app.post('/webhook', async (req, res) => {
     let {messages} = Whatsapp.parseMessage(req.body);
    for (const message of messages) {
        if (message.type === 'text_message') {
            const userMessage = message.text.body;
            const userId = message.from;

            // Initialize user state if not present
            if (!userStates[userId]) {
                setUserState(userId, 'menu');
            }

            let replyText = '';
            const userState = getUserState(userId);

            switch (userState) {
                case 'menu':
                    replyText = `Welcome to the Event Ticket Bot! Please choose an option:\n1. Find an event\n2. Find events by category\n3. View or Resend Tickets\n4. Help`;
                    setUserState(userId, 'choose_option');
                    break;

                case 'choose_option':
                    if (userMessage === '1') {
                        replyText = 'Please enter the name or type of event you are interested in:';
                        setUserState(userId, 'find_event');
                    } else if (userMessage === '2') {
                        replyText = 'Please enter the category of events you are interested in (e.g., Music, Sports, Arts):';
                        setUserState(userId, 'find_event_by_category');
                    } else if (userMessage === '3') {
                        replyText = 'Please provide your ticket reference number to view or resend your tickets:';
                        setUserState(userId, 'view_or_resend_tickets');
                    } else if (userMessage === '4') {
                        replyText = 'You\'re already here! If you need assistance or have any questions, feel free to ask.';
                        setUserState(userId, 'menu');
                    } else {
                        replyText = 'Invalid option. Please choose a valid option:\n1. Find an event\n2. Find events by category\n3. View or Resend Tickets\n4. Help';
                    }
                    break;

                case 'find_event':
                    const events = await searchEvents(userMessage);
                    if (events.length === 0) {
                        replyText = 'No events found for your search. Please try another query.';
                    } else {
                        replyText = 'Here are some events I found:\n';
                        events.slice(0, 5).forEach((event, index) => {
                            replyText += `${index + 1}. ${event.name.text} on ${event.start.local}\n`;
                        });
                    }
                    setUserState(userId, 'menu');
                    break;

                case 'find_event_by_category':
                    const categoryEvents = await searchEvents(userMessage);
                    if (categoryEvents.length === 0) {
                        replyText = 'No events found for the specified category. Please try another category.';
                    } else {
                        replyText = 'Here are some events I found in this category:\n';
                        categoryEvents.slice(0, 5).forEach((event, index) => {
                            replyText += `${index + 1}. ${event.name.text} on ${event.start.local}\n`;
                        });
                    }
                    setUserState(userId, 'menu');
                    break;

                case 'view_or_resend_tickets':
                    // Placeholder: Implement ticket lookup and resend logic here
                    replyText = 'This feature is under development. Please try again later.';
                    setUserState(userId, 'menu');
                    break;

                default:
                    replyText = 'Welcome to the Event Ticket Bot! Please choose an option:\n1. Find an event\n2. Find events by category\n3. View or Resend Tickets\n4. Help';
                    setUserState(userId, 'choose_option');
            }

            await sendMessage(userId, replyText);
        }
    }

    res.sendStatus(200);
});
app.use('*', (req, res) => res.status(404).send('404 Not Found'));
app.listen(3000, () => {
    console.log('Webhook is listening on port 3000');
});
