import WhatsAppCloudAPI from 'whatsappcloudapi_wrapper';
import dotenv from 'dotenv';
dotenv.config();

const whatsapp = new WhatsAppCloudAPI({
  accessToken: process.env.WA_ACCESS_TOKEN,
  senderPhoneNumberId: process.env.WA_PHONE_NUMBER_ID,
  WABA_ID: process.env.WA_BUSINESS_ID,
  graphAPIVersion: process.env.WA_API_VERSION,
});

const sendMessage = async (to, message) => {
  await whatsapp.sendText({
    recipientPhone: to,
    message,
  });
};

const mainMenu = async (username, userId) => {
  await whatsapp.sendSimpleButtons({
    message: `Hey ${username}, I'm Mukoto😎, your personal event ticketing assistant🚀. How can I help you today?`,
    recipientPhone: userId,
    listOfButtons: [
      {
        title: 'Find an event',
        id: '_find_event',
      },
      {
        title: 'Utilities',
        id: '_utilities',
      },
      {
        title: 'View Ticket',
        id: '_view_resend_ticket',
      },
    ],
  });
};

export const sendRadioButtons = async (events, headerText, bodyText, footerText, actionTitle, userId) => {
  const listOfSections = [
    {
      title: 'Hi there!',
      rows: events
        .map((event) => {
            return {
            id: event.event_id ?? event.category_id ?? event.ticket_type_id,
            title: (event.title ?? event.category_name ?? event.type_name).substring(0, 24),
            description: (event.description ?? event.category_name ?? `${event.price} ${event.currency_code}`).substring(0,24),
            };
        })
        .slice(0, 10),
    },
  ];
  await whatsapp.sendRadioButtons({
    recipientPhone: userId,
    headerText,
    bodyText,
    footerText,
    listOfSections,
    actionTitle
  });
};

const sendImage = async (userId, imageUrl, text) => {
  await whatsapp.sendImage({
    recipientPhone: userId,
    url: imageUrl,
    caption: text,
  });
};

const purchaseButtons = async (userId, eventId) => {
  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: 'Here is the event, what do you want to do next?',
    listOfButtons: [
      {
        title: 'Purchase Ticket',
        id: `_purchase`,
      },
      {
        title: 'Find More Events',
        id: '_find_event',
      },
      {
        title: 'Main Menu',
        id: '_main_menu',
      },
    ],
  });
};


const initiatePurchaseButtons = async (userId, replyText) => {
  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: replyText,
    listOfButtons: [
      {
        title: 'Yes',
        id: '_confirm_purchase',
      },
      {
        title: 'No',
        id: '_cancel_purchase',
      },
    ],
  });
};

const paymentMethodButtons = async (userId, replyText) => {
  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: replyText,
    listOfButtons: [
      {
        title: 'Ecocash',
        id: '_ecocash',
      },
      {
        title: 'Other',
        id: '_other_payment_methods',
      },
    ],
  });
};

export const sendButtons = async (userId, replyText, listOfButtons) => {
  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: replyText,
    listOfButtons,
  });
};
const paymentNumberButtons = async (userId, replyText) => {
  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: replyText,
    listOfButtons: [
      {
        title: 'Use this number',
        id: '_use_this_number',
      },
      {
        title: 'Other number',
        id: '_other_payment_number',
      },
    ],
  });
};

const ticketTypeButton = async (userId, ticketTypes) => {
  const listOfButtons = ticketTypes
    .map((type) => {
      return {
        title: (`${type.type_name} - ${type.price} ${type.currency_code}`).substring(0, 20),
        id: type.ticket_type_id,
      };
    })
    .slice(0, 3);

  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: 'Please choose a ticket type:',
    listOfButtons,
  });
};

const eventFallback = async (userId) => {
  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: 'No event found. Do you want to search for another event?',
    listOfButtons: [
      {
        title: 'Yes',
        id: '_find_event',
      },
      {
        title: 'Main Menu',
        id: '_main_menu',
      },
    ],
  });
};

const generateQRCode = async (text) => {
  let result = await whatsapp.createQRCodeMessage({
    message: text,
    imageType: 'png',
  });
  return result.data.qr_image_url;
};

const sendDocument = async (caption, filePath, userId) => {
  await whatsapp.sendDocument({
    recipientPhone: userId,
    caption,
    mime_type: 'application/pdf',
    file_path: filePath,
  });
};

export const sendLocation = async (userId, latitude, longitude, name, address) => {
  await whatsapp.sendLocation({
    recipientPhone: userId,
    latitude,
    longitude,
    name, 
    address
  });
}

export {
  sendMessage,
  whatsapp,
  sendDocument,
  generateQRCode,
  mainMenu,
  sendImage,
  purchaseButtons,
  eventFallback,
  ticketTypeButton,
  initiatePurchaseButtons,
  paymentMethodButtons,
  paymentNumberButtons,
};
