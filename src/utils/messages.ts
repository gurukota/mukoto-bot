import { logger } from './logger.js';

/**
 * Centralized message templates for better consistency and maintenance
 */
export class MessageTemplates {
  // Welcome and menu messages
  static getWelcomeMessage(username: string): string {
    return `Hello ${username}! 👋\n\nWelcome to *Mukoto* 🎫 - your personal event ticketing assistant.\n\nI'm here to help you discover amazing events and manage your tickets effortlessly. What would you like to do today?`;
  }

  static getMenuPrompt(): string {
    return 'Please select an option from the menu below:';
  }

  // Event discovery messages
  static getEventDiscoveryPrompt(): string {
    return '🔍 *Find Your Perfect Event*\n\nHow would you like to discover events today?';
  }

  static getSearchEventPrompt(): string {
    return '🔎 *Search Events*\n\nPlease type keywords to search for events (e.g., "music concert", "tech conference", "food festival"):';
  }

  static getCategorySelectionPrompt(): string {
    return '📂 *Browse by Category*\n\nChoose a category to explore events:';
  }

  static getEventSearchResults(count: number): string {
    if (count === 0) {
      return "😔 *No Events Found*\n\nSorry, we couldn't find any events matching your search. Would you like to try a different search or browse by category?";
    }
    return `🎉 *Found ${count} Event${count > 1 ? 's' : ''}*\n\nHere are the events we found for you:`;
  }

  static getCategoryEventsHeader(categoryName: string): string {
    return `🎯 *${categoryName} Events*\n\nHere are the available events in this category:`;
  }

  static getEventDetailsActions(): string {
    return '🎫 *Event Details*\n\nWhat would you like to do next?';
  }

  // Ticket-related messages
  static getTicketTypeSelection(): string {
    return "🎟️ *Select Ticket Type*\n\nChoose the type of ticket you'd like to purchase:";
  }

  static getTicketQuantityPrompt(ticketType: string): string {
    return `🔢 *Ticket Quantity*\n\nYou've selected: *${ticketType}*\n\nHow many tickets would you like to purchase? (Maximum: 10)`;
  }

  static getInvalidQuantityMessage(isOverLimit: boolean): string {
    if (isOverLimit) {
      return '⚠️ *Quantity Limit Exceeded*\n\nYou can purchase a maximum of 10 tickets per transaction. Please enter a number between 1 and 10.';
    }
    return '❌ *Invalid Quantity*\n\nPlease enter a valid number of tickets (1-10).';
  }

  static getPurchaseConfirmation(
    quantity: number,
    ticketType: string,
    total: number,
    currency: string
  ): string {
    return `💰 *Purchase Summary*\n\n🎫 Tickets: ${quantity}x ${ticketType}\n💵 Total: *${total} ${currency}*\n\n*Note: Additional charges may apply*\n\nPlease select your preferred payment method:`;
  }

  static getFreeRegistrationConfirmation(ticketType: string): string {
    return `🆓 *Free Registration*\n\nYou've selected: *${ticketType}*\n\nThis is a free event! Would you like to register now?`;
  }

  // Payment messages
  static getPaymentMethodPrompt(): string {
    return '💳 *Payment Method*\n\nChoose your preferred payment method:';
  }

  static getPhoneNumberSelection(): string {
    return '📱 *Payment Number*\n\nWhich phone number would you like to use for payment?';
  }

  static getCustomPhonePrompt(): string {
    return '📞 *Enter Payment Number*\n\nPlease enter the phone number for payment (e.g., 0771234567):';
  }

  // Ticket management messages
  static getTicketNotFound(): string {
    return "🔍 *No Tickets Found*\n\nWe couldn't find any tickets associated with your account. Purchase a ticket to get started!";
  }

  static getTicketSelectionPrompt(): string {
    return '🎫 *Your Tickets*\n\nSelect an event to view or resend your tickets:';
  }

  static getTicketCheckInSuccess(): string {
    return '✅ *Check-in Successful*\n\nTicket has been successfully checked in. Welcome to the event!';
  }

  static getTicketAlreadyCheckedIn(): string {
    return '⚠️ *Already Checked In*\n\nThis ticket has already been used for check-in. Please purchase a new ticket if needed.';
  }

  static getInvalidQRCode(): string {
    return '❌ *Invalid QR Code*\n\nThe scanned QR code is not valid. Please try scanning again or contact support.';
  }

  // Utility messages
  static getUtilityOptions(): string {
    return '🛠️ *Utility Options*\n\nWhat would you like to do?';
  }

  static getLocationPrompt(): string {
    return '📍 *Event Locations*\n\nSelect an event to view its location:';
  }

  static getNoTicketsForLocation(): string {
    return "📍 *No Event Tickets*\n\nYou don't have any tickets to view event locations. Purchase a ticket first!";
  }

  // Error and fallback messages
  static getGenericError(): string {
    return '❌ *Oops! Something went wrong*\n\nWe encountered an error while processing your request. Please try again or contact our support team.';
  }

  static getInvalidOption(): string {
    return '⚠️ *Invalid Option*\n\nPlease select a valid option from the menu.';
  }

  static getSessionTimeout(): string {
    return "⏰ *Session Timeout*\n\nYour session has expired. Let's start fresh!";
  }

  static getUnauthorizedAccess(): string {
    return "🚫 *Access Denied*\n\nYou don't have permission to perform this action.";
  }

  static getTryAgainPrompt(): string {
    return 'Would you like to try again?';
  }

  static getBackToMainMenu(): string {
    return 'Return to main menu';
  }

  // Context-aware error messages
  static getPaymentError(context?: string): string {
    const baseMessage = '💳 *Payment Error*\n\nThere was an issue processing your payment.';
    
    if (context === 'network') {
      return `${baseMessage}\n\nThis seems to be a network connectivity issue. Please check your connection and try again.`;
    }
    if (context === 'declined') {
      return `${baseMessage}\n\nYour payment was declined. Please try a different payment method or contact your bank.`;
    }
    if (context === 'timeout') {
      return `${baseMessage}\n\nThe payment request timed out. Don't worry, you haven't been charged. Would you like to try again?`;
    }
    
    return `${baseMessage}\n\nDon't worry, you haven't been charged. Let me help you complete your purchase.`;
  }

  static getSearchError(searchTerm?: string): string {
    const baseMessage = '🔍 *Search Issue*\n\n';
    
    if (searchTerm) {
      return `${baseMessage}I couldn't find events matching "${searchTerm}". Let me help you find what you're looking for with different search terms or browse our categories.`;
    }
    
    return `${baseMessage}I'm having trouble with the search right now. Would you like to browse events by category instead?`;
  }

  static getEventLoadError(): string {
    return '🎪 *Event Loading Error*\n\nI\'m having trouble loading event details right now. This might be a temporary issue. Would you like to try viewing another event or try again in a moment?';
  }

  static getTicketError(context?: string): string {
    const baseMessage = '🎫 *Ticket Issue*\n\n';
    
    if (context === 'not_found') {
      return `${baseMessage}I couldn't find your tickets. This might be because:\n• The tickets are still being processed\n• There was an error in your purchase\n• You're using a different phone number\n\nLet me help you locate your tickets.`;
    }
    if (context === 'generation') {
      return `${baseMessage}There was an issue generating your ticket. Don't worry, your purchase is secure. Let me try to resend your ticket.`;
    }
    
    return `${baseMessage}I encountered an issue with your ticket request. Let me help you resolve this.`;
  }

  static getServiceUnavailableError(serviceName?: string): string {
    const service = serviceName || 'one of our services';
    return `⚠️ *Service Temporarily Unavailable*\n\n${service} is currently experiencing issues. Our team is working to resolve this quickly.\n\nYou can:\n• Try again in a few minutes\n• Save your progress and return later\n• Get notified when the service is restored`;
  }

  static getRecoveryHelpMessage(attemptCount: number): string {
    if (attemptCount === 1) {
      return "🤔 *Let me help you*\n\nI noticed you might be having some trouble. What would you like to do?";
    }
    if (attemptCount === 2) {
      return "😅 *Still having trouble?*\n\nNo worries! Let me try a different approach to help you.";
    }
    
    return "🆘 *I'm here to help*\n\nI see you've been having some difficulties. Would you like me to connect you with a human helper, or shall we try something different?";
  }

  // Success messages
  static getRegistrationSuccess(eventTitle: string): string {
    return `🎉 *Registration Successful!*\n\nYou've been successfully registered for:\n*${eventTitle}*\n\nYour ticket will be sent to you shortly. See you at the event!`;
  }

  static getTicketSent(): string {
    return '📧 *Ticket Sent*\n\nYour ticket has been sent successfully! Please check above for your ticket document.';
  }

  static getCollectionReminder(eventTitle: string): string {
    return `📍 *Collection Required*\n\nPlease note: Your ticket for *${eventTitle}* requires collection at the venue. Please bring a valid ID for ticket collection.`;
  }

  // Event information formatting
  static formatEventDetails(
    title: string,
    description: string | null,
    formattedDate: string,
    location: string
  ): string {
    let details = `🎪 *${title.trim()}*\n\n`;

    if (description && description.trim()) {
      details += `📝 ${description.trim()}\n\n`;
    }

    details += `📅 ${formattedDate}\n`;
    details += `📍 ${location}`;

    return details;
  }

  // Category no events message
  static getCategoryNoEvents(): string {
    return '😔 *No Events in Category*\n\nThere are currently no events in this category. Would you like to explore other categories or search for specific events?';
  }

  // Validation messages
  static getSelectionRequired(): string {
    return '⚠️ *Selection Required*\n\nPlease make a selection from the options provided.';
  }

  static getEventNotFound(): string {
    return '❌ *Event Not Found*\n\nThe selected event could not be found. Please try selecting another event.';
  }

  static getTicketTypeNotFound(): string {
    return '❌ *Ticket Type Not Found*\n\nThe selected ticket type is not available. Please choose another option.';
  }

  static getNoTicketTypesAvailable(): string {
    return '😔 *No Tickets Available*\n\nThere are currently no tickets available for this event. Please check back later or contact the event organizer.';
  }

  // Helper method to log message sending
  static logMessage(
    userId: string,
    messageType: string,
    content: string
  ): void {
    logger.info('Sending message', {
      userId,
      messageType,
      messageLength: content.length,
      preview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
    });
  }
}

/**
 * Message builder for dynamic content
 */
export class MessageBuilder {
  private parts: string[] = [];

  constructor(private userId?: string) {}

  addHeader(text: string, emoji?: string): this {
    this.parts.push(`${emoji ? `${emoji} ` : ''}*${text}*\n`);
    return this;
  }

  addText(text: string): this {
    this.parts.push(`${text}\n`);
    return this;
  }

  addEmptyLine(): this {
    this.parts.push('\n');
    return this;
  }

  addBulletPoint(text: string, emoji?: string): this {
    this.parts.push(`${emoji ? `${emoji} ` : '• '}${text}\n`);
    return this;
  }

  addSeparator(): this {
    this.parts.push('─────────────────\n');
    return this;
  }

  build(): string {
    const message = this.parts.join('').trim();

    if (this.userId) {
      MessageTemplates.logMessage(this.userId, 'custom', message);
    }

    return message;
  }
}

export default MessageTemplates;
