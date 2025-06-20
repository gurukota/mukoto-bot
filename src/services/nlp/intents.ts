import { NlpManager } from 'node-nlp';

const manager = new NlpManager({ languages: ['en'], forceNER: true });

// Greeting Intent
manager.addDocument('en', 'Hello', 'greet');
manager.addDocument('en', 'Hi there', 'greet');

// Goodbye Intent
manager.addDocument('en', 'Goodbye', 'goodbye');
manager.addDocument('en', 'See you later', 'goodbye');

// Thank You Intent
manager.addDocument('en', 'Thank you', 'thank_you');
manager.addDocument('en', 'Thanks a lot', 'thank_you');

// Event Search Intents
manager.addDocument('en', 'Find events near me', 'search_events');
manager.addDocument('en', 'What events are happening this weekend', 'search_events');
manager.addDocument('en', 'Tell me more about the concert', 'event_details');
manager.addDocument('en', 'Details about the comedy show', 'event_details');

// Ticket Purchase Intents
manager.addDocument('en', 'I want to buy tickets for the rock concert', 'select_event');
manager.addDocument('en', 'I want tickets for the Friday show', 'choose_date');
manager.addDocument('en', 'I need 3 tickets', 'select_ticket_quantity');
manager.addDocument('en', 'Two tickets, please', 'select_ticket_quantity');

// Payment Intents
manager.addDocument('en', 'I\'ll pay with my credit card', 'payment_method');
manager.addDocument('en', 'Do you accept PayPal', 'payment_method');
manager.addDocument('en', 'My card number is 1234-5678-9012-3456', 'provide_payment_details');
manager.addDocument('en', 'Confirm my purchase', 'confirm_payment');
manager.addDocument('en', 'Yes, buy the tickets', 'confirm_payment');

// Order Management Intents
manager.addDocument('en', 'What\'s the status of my order', 'view_order');
manager.addDocument('en', 'Show my order details', 'view_order');
manager.addDocument('en', 'I want to cancel my ticket', 'cancel_order');
manager.addDocument('en', 'Can I get a refund', 'cancel_order');

// Account Management Intents
manager.addDocument('en', 'Sign me up', 'create_account');
manager.addDocument('en', 'I want to create an account', 'create_account');
manager.addDocument('en', 'Log me in', 'login');
manager.addDocument('en', 'Sign in to my account', 'login');
manager.addDocument('en', 'I forgot my password', 'reset_password');
manager.addDocument('en', 'Reset my password', 'reset_password');

// Support Intents
manager.addDocument('en', 'I need help', 'customer_support');
manager.addDocument('en', 'Contact support', 'customer_support');
manager.addDocument('en', 'What is your refund policy', 'faqs');
manager.addDocument('en', 'How do I change my booking', 'faqs');

// Miscellaneous Intents
manager.addDocument('en', 'Where is the event', 'location_information');
manager.addDocument('en', 'Give me directions to the theater', 'location_information');
manager.addDocument('en', 'What events do you recommend', 'event_recommendations');
manager.addDocument('en', 'Suggest some good concerts', 'event_recommendations');

// Custom Intents
manager.addDocument('en', 'Any deals available', 'special_offers');
manager.addDocument('en', 'Do you have any promo codes', 'special_offers');
manager.addDocument('en', 'Is the venue wheelchair accessible', 'accessibility_information');
manager.addDocument('en', 'Do you offer any accessibility services', 'accessibility_information');

(async () => {
    await manager.train();
    manager.save();
    console.log('NLP Model trained and saved.');
})();

interface NlpResponse {
    readonly utterance: string;
    readonly locale: string;
    readonly language: string;
    readonly classifications: Array<{
        readonly intent: string;
        readonly score: number;
    }>;
    readonly intent: string;
    readonly score: number;
    readonly domain: string | undefined;
    readonly sourceEntities: any[];
    readonly entities: any[];
    readonly answers: any[];
    readonly answer: string | undefined;
    readonly actions: any[];
    readonly sentiment: {
        readonly score: number;
        readonly comparative: number;
        readonly vote: string;
        readonly numWords: number;
        readonly numHits: number;
        readonly type: string;
        readonly language: string;
    };
}

async function processMessage(message: string): Promise<NlpResponse> {
    return await manager.process('en', message);
}

export { processMessage };
