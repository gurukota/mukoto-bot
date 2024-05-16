import WhatsAppCloudAPI from 'whatsappcloudapi_wrapper';
import dotenv from 'dotenv';
dotenv.config();

const whatsapp = new WhatsAppCloudAPI({
    accessToken: process.env.WA_ACCESS_TOKEN,
    senderPhoneNumberId: process.env.WA_PHONE_NUMBER_ID,
    WABA_ID: process.env.WA_API_VERSION,
    graphAPIVersion: process.env.WA_API_VERSION,    
});

async function sendMessage(to, message) {
    await whatsapp.sendMessage({
        recipientPhone: to,
        message,
    });
}

export { sendMessage };
