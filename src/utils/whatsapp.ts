import WhatsAppCloudAPI from 'whatsappcloudapi_wrapper';
import dotenv from 'dotenv';
import axios from 'axios';
// Define SimpleButton interface here since whatsapp.d.ts is not recognized as a module
export interface SimpleButton {
  title: string;
  id: string;
}

dotenv.config();

const whatsapp = new WhatsAppCloudAPI({
  accessToken: process.env.WA_ACCESS_TOKEN || '',
  senderPhoneNumberId: process.env.WA_PHONE_NUMBER_ID || '',
  WABA_ID: process.env.WA_BUSINESS_ID || '',
  graphAPIVersion: process.env.WA_API_VERSION || '',
});

const sendMessage = async (to: string, message: string): Promise<void> => {
  await whatsapp.sendText({
    recipientPhone: to,
    message,
  });
};

const mainMenu = async (username: string, userId: string): Promise<void> => {
  await whatsapp.sendSimpleButtons({
    message: `Hey ${username}, Welcome to Mukoto😎, your personal event ticketing assistant🚀. How can I help you today?`,
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
        title: 'View Tickets',
        id: '_view_resend_ticket',
      },
    ],
  });
};

export const sendRadioButtons = async (
  dataArray: any[],
  headerText: string,
  bodyText: string,
  footerText: string,
  actionTitle: string,
  userId: string,
  type: 'category' | 'event' | 'ticket_type'
): Promise<void> => {
  const listOfSections = [
    {
      title: 'Hi there!',
      rows: dataArray
        .map((data) => {
          let title: string, description: string;
          switch (type) {
            case 'category':
              title = data.categoryName;
              description = data.categoryName;
              break;
            case 'event':
              title = data.title;
              description = data.description;
              break;
            case 'ticket_type':
              title = data.typeName;
              description = `${data.price} ${data.currencyCode}`;
              break;
            default:
              title = '';
              description = '';
          }
          return {
            id: data.id,
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

const sendImage = async (
  userId: string,
  imageUrl: string,
  text: string
): Promise<void> => {
  await whatsapp.sendImage({
    recipientPhone: userId,
    url: imageUrl,
    caption: text,
  });
};

const purchaseButtons = async (
  userId: string,
  eventId: string
): Promise<void> => {
  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: 'Here is the event, what do you want to do next?',
    listOfButtons: [
      {
        title: 'Purchase Ticket',
        id: '_purchase',
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

const initiatePurchaseButtons = async (
  userId: string,
  replyText: string
): Promise<void> => {
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

const paymentMethodButtons = async (
  userId: string,
  replyText: string
): Promise<void> => {
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

export const sendButtons = async (
  userId: string,
  replyText: string,
  listOfButtons: SimpleButton[]
): Promise<void> => {
  await whatsapp.sendSimpleButtons({
    recipientPhone: userId,
    message: replyText,
    listOfButtons,
  });
};

const paymentNumberButtons = async (
  userId: string,
  replyText: string
): Promise<void> => {
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

const ticketTypeButton = async (
  userId: string,
  ticketTypes: any[]
): Promise<void> => {
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

const eventFallback = async (userId: string): Promise<void> => {
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

const generateQRCode = async (text: string): Promise<string> => {
  const result = await whatsapp.createQRCodeMessage({
    message: text,
    imageType: 'png',
  });
  return result.data?.qr_image_url || '';
};

const sendDocument = async (
  caption: string,
  filePath: string,
  userId: string
): Promise<void> => {
  await whatsapp.sendDocument({
    recipientPhone: userId,
    caption: caption.toLowerCase(),
    mime_type: 'application/pdf',
    file_path: filePath,
  });
};

export const sendLocation = async (
  userId: string,
  latitude: number,
  longitude: number,
  name: string,
  address: string
): Promise<void> => {
  await whatsapp.sendLocation({
    recipientPhone: userId,
    latitude,
    longitude,
    name,
    address,
  });
};

export const sendUrlButton = async (
  recipientPhone: string,
  headerText: string,
  bodyText: string,
  footerText: string,
  messageText: string,
  buttonUrl: string
): Promise<void> => {
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
            type: 'text',
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
            },
          },
        },
      },
    });
    console.log(response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

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
