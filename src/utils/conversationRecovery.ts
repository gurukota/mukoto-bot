import { logger } from './logger.js';
import { MessageTemplates } from './messages.js';
import { sendMessage, sendButtons, mainMenu, SimpleButton } from './whatsapp.js';
import { getSession, setSession } from '../config/session.js';
import { getUserState, setUserState } from '../config/state.js';

export interface ConversationContext {
  userId: string;
  userState: string;
  session: any;
  lastAction?: string;
  errorType?: string;
  attemptCount?: number;
  lastSuccessfulState?: string;
}

export interface RecoveryStrategy {
  condition: (context: ConversationContext) => boolean;
  action: (context: ConversationContext) => Promise<void>;
  description: string;
}

export class ConversationRecoveryManager {
  private recoveryStrategies: RecoveryStrategy[] = [];
  private maxRetryAttempts = 3;
  private userRetryAttempts = new Map<string, number>();

  constructor() {
    this.initializeRecoveryStrategies();
  }

  private initializeRecoveryStrategies(): void {
    // Strategy 1: Payment-related errors
    this.recoveryStrategies.push({
      condition: (context) => 
        context.userState.includes('payment') || 
        context.userState.includes('paynow') ||
        (context.lastAction?.includes('payment') ?? false),
      action: async (context) => {
        const { userId, session } = context;
        const replyText = "💳 *Payment Issue Detected*\n\nIt looks like there was an issue with your payment. Let me help you complete your purchase.\n\nWould you like to:";
        
        const buttons: SimpleButton[] = [
          { title: '🔄 Retry Payment', id: '_retry_payment' },
          { title: '💳 Change Method', id: '_change_payment_method' },
          { title: '📞 Get Help', id: '_payment_help' },
          { title: '🏠 Start Over', id: '_main_menu' }
        ];

        await sendButtons(userId, replyText, buttons);
        await setUserState(userId, 'payment_recovery');
        await setSession(userId, { ...session, recoveryReason: 'payment_error' });
      },
      description: 'Payment process recovery'
    });

    // Strategy 2: Event search/selection errors
    this.recoveryStrategies.push({
      condition: (context) => 
        context.userState.includes('event') || 
        context.userState.includes('search') ||
        (context.lastAction?.includes('event') ?? false),
      action: async (context) => {
        const { userId, session } = context;
        const replyText = "🔍 *Let's Find Your Event*\n\nI noticed you were looking for events. Let me help you find what you're looking for.\n\nWhat would you prefer to do?";
        
        const buttons: SimpleButton[] = [
          { title: '🔎 Search Again', id: '_search_events' },
          { title: '📂 Browse Categories', id: '_browse_categories' },
          { title: '🎯 Popular Events', id: '_popular_events' },
          { title: '🏠 Main Menu', id: '_main_menu' }
        ];

        await sendButtons(userId, replyText, buttons);
        await setUserState(userId, 'event_recovery');
        await setSession(userId, { ...session, recoveryReason: 'event_search_error' });
      },
      description: 'Event search and selection recovery'
    });

    // Strategy 3: Ticket-related errors
    this.recoveryStrategies.push({
      condition: (context) => 
        context.userState.includes('ticket') || 
        (context.lastAction?.includes('ticket') ?? false),
      action: async (context) => {
        const { userId, session } = context;
        const replyText = "🎫 *Ticket Issue*\n\nI see you were working with tickets. How can I help you?";
        
        const buttons: SimpleButton[] = [
          { title: '🎟️ Buy Tickets', id: '_buy_tickets' },
          { title: '👀 View My Tickets', id: '_view_tickets' },
          { title: '📧 Resend Tickets', id: '_resend_tickets' },
          { title: '🏠 Main Menu', id: '_main_menu' }
        ];

        await sendButtons(userId, replyText, buttons);
        await setUserState(userId, 'ticket_recovery');
        await setSession(userId, { ...session, recoveryReason: 'ticket_error' });
      },
      description: 'Ticket management recovery'
    });

    // Strategy 4: Registration/signup errors
    this.recoveryStrategies.push({
      condition: (context) => 
        context.userState.includes('registration') || 
        context.userState.includes('signup') ||
        (context.lastAction?.includes('register') ?? false),
      action: async (context) => {
        const { userId, session } = context;
        const replyText = "📝 *Registration Help*\n\nI noticed you were registering for an event. Let me help you complete the process.";
        
        const buttons: SimpleButton[] = [
          { title: '✅ Continue Registration', id: '_continue_registration' },
          { title: '🔄 Start Over', id: '_restart_registration' },
          { title: '❓ Get Help', id: '_registration_help' },
          { title: '🏠 Main Menu', id: '_main_menu' }
        ];

        await sendButtons(userId, replyText, buttons);
        await setUserState(userId, 'registration_recovery');
        await setSession(userId, { ...session, recoveryReason: 'registration_error' });
      },
      description: 'Registration process recovery'
    });

    // Strategy 5: General navigation confusion
    this.recoveryStrategies.push({
      condition: (context) => 
        (context.attemptCount ?? 0) > 2,
      action: async (context) => {
        const { userId, session } = context;
        const replyText = "🤔 *Let me help you*\n\nIt seems like you might be having trouble finding what you need. I'm here to help!\n\nWhat are you trying to do today?";
        
        const buttons: SimpleButton[] = [
          { title: '🎪 Find Events', id: '_find_events' },
          { title: '🎫 Manage Tickets', id: '_manage_tickets' },
          { title: '💳 Payment Help', id: '_payment_help' },
          { title: '🆘 Talk to Human', id: '_human_help' }
        ];

        await sendButtons(userId, replyText, buttons);
        await setUserState(userId, 'general_recovery');
        await setSession(userId, { ...session, recoveryReason: 'general_confusion' });
      },
      description: 'General confusion and navigation help'
    });

    // Strategy 6: Service unavailable fallback
    this.recoveryStrategies.push({
      condition: (context) => 
        context.errorType === 'service_unavailable' ||
        context.errorType === 'external_api_error',
      action: async (context) => {
        const { userId, session } = context;
        const replyText = "⚠️ *Service Temporarily Unavailable*\n\nSome of our services are currently experiencing issues. Here's what you can do:";
        
        const buttons: SimpleButton[] = [
          { title: '🔄 Try Again', id: '_retry_action' },
          { title: '💾 Save & Try Later', id: '_save_for_later' },
          { title: '📞 Get Notified', id: '_notify_when_ready' },
          { title: '🏠 Main Menu', id: '_main_menu' }
        ];

        await sendButtons(userId, replyText, buttons);
        await setUserState(userId, 'service_recovery');
        await setSession(userId, { ...session, recoveryReason: 'service_unavailable' });
      },
      description: 'Service unavailability recovery'
    });
  }

  async handleError(
    userId: string,
    error: Error,
    userState: string,
    session: any,
    lastAction?: string
  ): Promise<void> {
    try {
      logger.warn('Initiating conversation recovery', {
        userId,
        error: error.message,
        userState,
        lastAction,
        sessionData: JSON.stringify(session, null, 2).substring(0, 200)
      });

      // Track retry attempts
      const currentAttempts = this.userRetryAttempts.get(userId) || 0;
      this.userRetryAttempts.set(userId, currentAttempts + 1);

      const context: ConversationContext = {
        userId,
        userState,
        session,
        lastAction,
        errorType: this.categorizeError(error),
        attemptCount: currentAttempts + 1,
        lastSuccessfulState: session?.lastSuccessfulState
      };

      // Find and execute appropriate recovery strategy
      const strategy = this.findRecoveryStrategy(context);
      
      if (strategy) {
        logger.info('Executing recovery strategy', {
          userId,
          strategy: strategy.description,
          attemptCount: context.attemptCount
        });
        
        await strategy.action(context);
        
        // Save the last successful state before the error
        if (userState !== 'menu' && userState !== 'choose_option') {
          await setSession(userId, { 
            ...session, 
            lastSuccessfulState: userState 
          });
        }
      } else {
        // Fallback to graceful degradation
        await this.gracefulFallback(userId, context);
      }

      // Reset retry count on successful recovery
      if (currentAttempts >= this.maxRetryAttempts) {
        this.userRetryAttempts.delete(userId);
      }

    } catch (recoveryError) {
      logger.error('Recovery strategy failed', {
        userId,
        originalError: error.message,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError
      });
      
      // Ultimate fallback - send user to main menu with help
      await this.ultimateFallback(userId);
    }
  }

  private findRecoveryStrategy(context: ConversationContext): RecoveryStrategy | null {
    return this.recoveryStrategies.find(strategy => strategy.condition(context)) || null;
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'network_error';
    }
    if (message.includes('payment') || message.includes('paynow')) {
      return 'payment_error';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found_error';
    }
    if (message.includes('unauthorized') || message.includes('403')) {
      return 'auth_error';
    }
    if (message.includes('service') || message.includes('api')) {
      return 'service_unavailable';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation_error';
    }
    
    return 'unknown_error';
  }

  private async gracefulFallback(userId: string, context: ConversationContext): Promise<void> {
    const { session, attemptCount } = context;
    
    if (attemptCount && attemptCount > this.maxRetryAttempts) {
      await this.offerHumanHelp(userId);
      return;
    }

    const replyText = "😅 *Oops! Something unexpected happened*\n\nDon't worry, I'm here to help you get back on track. What would you like to do?";
    
    const buttons: SimpleButton[] = [
      { title: '🔄 Try Again', id: '_retry_last_action' },
      { title: '🏠 Start Fresh', id: '_main_menu' },
      { title: '📞 Get Help', id: '_human_help' },
    ];

    // Add context-specific option if we know what they were doing
    if (session?.lastSuccessfulState) {
      buttons.unshift({ title: '⏪ Go Back', id: '_return_to_last_state' });
    }

    await sendButtons(userId, replyText, buttons);
    await setUserState(userId, 'error_recovery');
  }

  private async offerHumanHelp(userId: string): Promise<void> {
    const replyText = "🆘 *Need Human Assistance?*\n\nI see you're having some trouble. Would you like me to connect you with a human helper, or shall we start fresh?";
    
    const buttons: SimpleButton[] = [
      { title: '👤 Talk to Human', id: '_human_help' },
      { title: '🔄 Start Over', id: '_main_menu' },
      { title: '📧 Send Feedback', id: '_send_feedback' }
    ];

    await sendButtons(userId, replyText, buttons);
    await setUserState(userId, 'human_help_offer');
  }

  private async ultimateFallback(userId: string): Promise<void> {
    try {
      await sendMessage(
        userId, 
        "😔 I apologize for the technical difficulties. Let me reset everything and start fresh to help you better."
      );
      
      // Reset user state and session
      await setUserState(userId, 'menu');
      await setSession(userId, { resetReason: 'ultimate_fallback' });
      
      // Wait a moment then show main menu
      setTimeout(async () => {
        try {
          await mainMenu('there', userId);
          await setUserState(userId, 'choose_option');
        } catch (error) {
          logger.error('Ultimate fallback failed to show main menu', { userId, error });
        }
      }, 2000);
      
    } catch (error) {
      logger.error('Ultimate fallback completely failed', { userId, error });
    }
  }

  // Handle recovery button interactions
  async handleRecoveryAction(
    userId: string, 
    buttonId: string, 
    userState: string,
    session: any
  ): Promise<boolean> {
    try {
      switch (buttonId) {
        case '_retry_payment':
          if (session?.paymentMethod && session?.total) {
            await setUserState(userId, 'choose_payment_method');
            const replyText = "💳 *Retrying Payment*\n\nLet's try processing your payment again.";
            await sendMessage(userId, replyText);
            return true;
          }
          break;

        case '_change_payment_method':
          await setUserState(userId, 'choose_payment_method');
          const replyText = "💳 *Choose Payment Method*\n\nLet's try a different payment method.";
          await sendMessage(userId, replyText);
          return true;

        case '_retry_last_action':
          if (session?.lastSuccessfulState) {
            await setUserState(userId, session.lastSuccessfulState);
            await sendMessage(userId, "🔄 *Retrying your last action...*");
            return true;
          }
          break;

        case '_return_to_last_state':
          if (session?.lastSuccessfulState) {
            await setUserState(userId, session.lastSuccessfulState);
            await sendMessage(userId, "⏪ *Taking you back to where you were...*");
            return true;
          }
          break;

        case '_human_help':
          await this.initiateHumanHandoff(userId);
          return true;

        case '_send_feedback':
          await this.initiateFeedbackCollection(userId);
          return true;

        default:
          return false;
      }
    } catch (error) {
      logger.error('Error handling recovery action', { userId, buttonId, error });
      return false;
    }
    
    return false;
  }

  private async initiateHumanHandoff(userId: string): Promise<void> {
    const replyText = "👤 *Connecting you with human support*\n\nI'm setting up a connection with our support team. They'll be able to help you with any issues you're experiencing.\n\n� *Support Contact*\n• Email: support@mukoto.app\n\nOur team will get back to you within 24 hours. In the meantime, you can continue using the bot or try again later.";
    
    await sendMessage(userId, replyText);
    
    // Log for human support team
    logger.info('Human support requested', {
      userId,
      timestamp: new Date().toISOString(),
      reason: 'User requested human help through recovery system'
    });
    
    await setUserState(userId, 'awaiting_human_support');
  }

  private async initiateFeedbackCollection(userId: string): Promise<void> {
    const replyText = "📧 *Share Your Feedback*\n\nI'd love to hear about your experience! Please describe what went wrong or what you'd like me to improve.\n\nJust type your message and I'll make sure our team sees it.";
    
    await sendMessage(userId, replyText);
    await setUserState(userId, 'collecting_feedback');
  }

  // Clear retry attempts for successful operations
  clearRetryAttempts(userId: string): void {
    this.userRetryAttempts.delete(userId);
  }

  // Get current retry count for a user
  getRetryCount(userId: string): number {
    return this.userRetryAttempts.get(userId) || 0;
  }
}

// Export singleton instance
export const conversationRecovery = new ConversationRecoveryManager();
