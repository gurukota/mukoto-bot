import { sendMessage } from './whatsapp.js';
import { MessageTemplates } from './messages.js';
import { logger } from './logger.js';

/**
 * Send collection message for tickets that need to be collected physically
 */
export const sendCollectionMessage = async (
  userId: string,
  eventTitle: string
): Promise<void> => {
  try {
    const collectionMessage =
      MessageTemplates.getCollectionReminder(eventTitle);
    await sendMessage(userId, collectionMessage);

    logger.info('Collection message sent successfully', { userId, eventTitle });
  } catch (error) {
    logger.error('Error sending collection message', {
      error,
      userId,
      eventTitle,
    });
  }
};
