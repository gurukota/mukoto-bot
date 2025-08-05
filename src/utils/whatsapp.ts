import WhatsAppCloudAPI from 'whatsappcloudapi_wrapper';
import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from './logger.js';
import { ExternalAPIError } from './errorHandler.js';

// Define SimpleButton interface here since whatsapp.d.ts is not recognized as a module
export interface SimpleButton {
  title: string;
  id: string;
}

const whatsapp = new WhatsAppCloudAPI({
  accessToken: config.WA_ACCESS_TOKEN,
  senderPhoneNumberId: config.WA_PHONE_NUMBER_ID,
  WABA_ID: config.WA_BUSINESS_ID,
  graphAPIVersion: config.WA_API_VERSION,
});

const sendMessage = async (to: string, message: string): Promise<void> => {
  try {
    await whatsapp.sendText({
      recipientPhone: to,
      message,
    });
    logger.debug('Message sent successfully', {
      to,
      messageLength: message.length,
    });
  } catch (error) {
    logger.error('Failed to send message', { to, error });
    throw new ExternalAPIError('WhatsApp', 'Failed to send message');
  }
};

const mainMenu = async (username: string, userId: string): Promise<void> => {
  try {
    await whatsapp.sendSimpleButtons({
      message: `Hello ${username}! 👋\n\nWelcome to *Mukoto* 🎫 - your personal event ticketing assistant.\n\nI'm here to help you discover amazing events and manage your tickets effortlessly. What would you like to do today?`,
      recipientPhone: userId,
      listOfButtons: [
        {
          title: '🔍 Find Events',
          id: '_find_event',
        },
        {
          title: '🎫 My Tickets',
          id: '_view_resend_ticket',
        },
        {
          title: '🛠️ Utilities',
          id: '_utilities',
        },
      ],
    });
    logger.debug('Main menu sent successfully', { username, userId });
  } catch (error) {
    logger.error('Failed to send main menu', { username, userId, error });
    throw new ExternalAPIError('WhatsApp', 'Failed to send main menu');
  }
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
        .map(data => {
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
              if (Number(data.price) === 0) {
                // Free ticket - just show ticket type description or generic message
                description = data.description || 'Registration available';
              } else {
                // Paid ticket - show price
                description = `${data.price} ${data.currencyCode}`;
              }
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
  try {
    await whatsapp.sendSimpleButtons({
      recipientPhone: userId,
      message: '🎫 *Event Details*\n\nWhat would you like to do next?',
      listOfButtons: [
        {
          title: '💳 Purchase Ticket',
          id: '_purchase',
        },
        {
          title: '🔍 Find More Events',
          id: '_find_event',
        },
        {
          title: '🏠 Main Menu',
          id: '_main_menu',
        },
      ],
    });
    logger.debug('Purchase buttons sent successfully', { userId, eventId });
  } catch (error) {
    logger.error('Failed to send purchase buttons', { userId, eventId, error });
    throw new ExternalAPIError('WhatsApp', 'Failed to send purchase buttons');
  }
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
  try {
    await whatsapp.sendSimpleButtons({
      recipientPhone: userId,
      message: replyText,
      listOfButtons: [
        {
          title: '💰 EcoCash',
          id: '_ecocash',
        },
        {
          title: '🏦 InnBucks',
          id: '_innbucks',
        },
        {
          title: '🌐 Web Payment',
          id: '_web',
        },
      ],
    });
    logger.debug('Payment method buttons sent successfully', { userId });
  } catch (error) {
    logger.error('Failed to send payment method buttons', { userId, error });
    throw new ExternalAPIError(
      'WhatsApp',
      'Failed to send payment method buttons'
    );
  }
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
  try {
    await whatsapp.sendSimpleButtons({
      recipientPhone: userId,
      message: replyText,
      listOfButtons: [
        {
          title: '✅ Use This Number',
          id: '_use_this_number',
        },
        {
          title: '📱 Different Number',
          id: '_other_payment_number',
        },
      ],
    });
    logger.debug('Payment number buttons sent successfully', { userId });
  } catch (error) {
    logger.error('Failed to send payment number buttons', { userId, error });
    throw new ExternalAPIError(
      'WhatsApp',
      'Failed to send payment number buttons'
    );
  }
};

const ticketTypeButton = async (
  userId: string,
  ticketTypes: any[]
): Promise<void> => {
  const listOfButtons = ticketTypes
    .map(type => {
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
  link: string,
  userId: string
): Promise<void> => {
  await whatsapp.sendDocument({
    recipientPhone: userId,
    url: link,
    caption: 'Mukoto Ticket',
    mime_type: 'application/pdf',
    file_name: caption.toLowerCase() + '.pdf',
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
