import WhatsAppCloudAPI from 'whatsappcloudapi_wrapper';
import dotenv from 'dotenv';
import axios from 'axios';
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

export const sendRadioButtons = async (
  dataArray,
  headerText,
  bodyText,
  footerText,
  actionTitle,
  userId,
  type
) => {
  const listOfSections = [
    {
      title: 'Hi there!',
      rows: dataArray
        .map((data) => {
          let id, title, description;
          if (type === 'category') {
            id = data.category_id;
            title = data.category_name ?? 'No category';
            description = data.category_name ?? 'No category';
          } else if (type === 'event') {
            id = data.event_id;
            title = data.title ?? 'No title';
            description = data.description ?? 'No description';
          } else if (type === 'ticket_type') {
            id = data.ticket_type_id;
            title = data.type_name ?? 'No title';
            description = `${data.price} ${data.currency_code}` ?? 'No price';
          }
          return {
            id,
            title: title.substring(0, 24),
            description,
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
    actionTitle,
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
        title: 'InnBucks',
        id: '_innbucks',
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
        title:
          `${type.type_name} - ${type.price} ${type.currency_code}`.substring(
            0,
            20
          ),
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
    caption: caption.toLowerCase(),
    mime_type: 'application/pdf',
    file_path: filePath,
  });
};

export const sendLocation = async (
  userId,
  latitude,
  longitude,
  name,
  address
) => {
  await whatsapp.sendLocation({
    recipientPhone: userId,
    latitude,
    longitude,
    name,
    address,
  });
};

export const sendUrlButton = async (recipientPhone, headerText, bodyText, footerText, messageText, buttonUrl) => {
  try {
    const response = await axios({
      method: 'post',
      url: `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          header: {
            type: "text",
            text: headerText,
          },
          body: {
            text: bodyText,
          },
          footer: {
            text: footerText,
          },
          action: {
                name: 'cta_url',
                parameters: {
                  display_text: messageText,
                  url: buttonUrl,
                }

          },
        },
      },
    });
    console.log(response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
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
