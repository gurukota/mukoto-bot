import { sendMessage } from './whatsapp.js';

/**
 * Send collection message for tickets that need to be collected physically
 */
export const sendCollectionMessage = async (
  userId: string,
  eventTitle: string
): Promise<void> => {
  try {
    const collectionMessage = `
📍 *Ticket Collection Required*

Your digital ticket for *${eventTitle}* has been generated successfully! 

However, this event requires physical ticket collection. Please use your digital ticket to collect your physical tickets at the designated collection point.

⏰ Please collect your physical tickets before the event starts. Bring:
• Your digital ticket (PDF or screenshot)

For collection location, hours, and more details, please contact the event organizer.

Thank you for choosing Mukoto! 🎉
    `.trim();

    await sendMessage(userId, collectionMessage);
  } catch (error) {
    console.error('Error sending collection message:', error);
  }
};
