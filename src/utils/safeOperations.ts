import { logger } from './logger.js';
import { conversationRecovery } from './conversationRecovery.js';
import { MessageTemplates } from './messages.js';
import { sendMessage } from './whatsapp.js';
import { PaymentError, EventNotFoundError, TicketError, NetworkError } from './errorHandler.js';

/**
 * Safe wrapper for async operations with conversation-aware error handling
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  context: {
    userId: string;
    userState: string;
    session: any;
    operationType: 'payment' | 'event' | 'ticket' | 'search' | 'api' | 'general';
    fallbackValue?: T;
  }
): Promise<T | undefined> {
  try {
    const result = await operation();
    
    // Clear any previous error counts on successful operation
    conversationRecovery.clearRetryAttempts(context.userId);
    
    return result;
  } catch (error) {
    logger.error(`Safe operation failed: ${context.operationType}`, {
      userId: context.userId,
      userState: context.userState,
      error: error instanceof Error ? error.message : error,
    });

    // Use conversation recovery for better error handling
    await conversationRecovery.handleError(
      context.userId,
      error instanceof Error ? error : new Error(String(error)),
      context.userState,
      context.session,
      `${context.operationType}_operation`
    );

    return context.fallbackValue;
  }
}

/**
 * Wrapper for payment operations with specific error handling
 */
export async function safePaymentOperation<T>(
  operation: () => Promise<T>,
  userId: string,
  userState: string,
  session: any
): Promise<T | undefined> {
  return safeAsyncOperation(operation, {
    userId,
    userState,
    session,
    operationType: 'payment'
  });
}

/**
 * Wrapper for event-related operations
 */
export async function safeEventOperation<T>(
  operation: () => Promise<T>,
  userId: string,
  userState: string,
  session: any,
  fallbackValue?: T
): Promise<T | undefined> {
  return safeAsyncOperation(operation, {
    userId,
    userState,
    session,
    operationType: 'event',
    fallbackValue
  });
}

/**
 * Wrapper for ticket operations
 */
export async function safeTicketOperation<T>(
  operation: () => Promise<T>,
  userId: string,
  userState: string,
  session: any
): Promise<T | undefined> {
  return safeAsyncOperation(operation, {
    userId,
    userState,
    session,
    operationType: 'ticket'
  });
}

/**
 * Wrapper for search operations
 */
export async function safeSearchOperation<T>(
  operation: () => Promise<T>,
  userId: string,
  userState: string,
  session: any,
  fallbackValue?: T
): Promise<T | undefined> {
  return safeAsyncOperation(operation, {
    userId,
    userState,
    session,
    operationType: 'search',
    fallbackValue
  });
}

/**
 * Wrapper for API calls with network error handling
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  userId: string,
  userState: string,
  session: any,
  apiName: string = 'API'
): Promise<T | undefined> {
  try {
    const result = await Promise.race([
      apiCall(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new NetworkError(`${apiName} request timeout`)), 10000)
      )
    ]);
    
    conversationRecovery.clearRetryAttempts(userId);
    return result;
  } catch (error) {
    logger.error(`${apiName} call failed`, {
      userId,
      error: error instanceof Error ? error.message : error,
    });

    if (error instanceof Error && error.message.includes('timeout')) {
      await conversationRecovery.handleError(
        userId,
        new NetworkError(`${apiName} is taking longer than usual to respond`),
        userState,
        session,
        `${apiName.toLowerCase()}_timeout`
      );
    } else {
      await conversationRecovery.handleError(
        userId,
        error instanceof Error ? error : new Error(String(error)),
        userState,
        session,
        `${apiName.toLowerCase()}_error`
      );
    }

    return undefined;
  }
}

/**
 * Graceful message sending with error handling
 */
export async function safeSendMessage(
  userId: string,
  message: string,
  retryCount: number = 0
): Promise<boolean> {
  try {
    await sendMessage(userId, message);
    return true;
  } catch (error) {
    logger.error('Failed to send message', {
      userId,
      message: message.substring(0, 100),
      retryCount,
      error: error instanceof Error ? error.message : error,
    });

    // Retry once with a simpler message if the original fails
    if (retryCount === 0) {
      return safeSendMessage(
        userId,
        "I'm having trouble sending a message. Please try again.",
        1
      );
    }

    return false;
  }
}

/**
 * Context-aware error message generator
 */
export function getContextualErrorMessage(
  error: Error,
  userState: string,
  operationType?: string
): string {
  // Payment errors
  if (error instanceof PaymentError || userState.includes('payment')) {
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return MessageTemplates.getPaymentError('network');
    }
    if (error.message.includes('declined') || error.message.includes('failed')) {
      return MessageTemplates.getPaymentError('declined');
    }
    return MessageTemplates.getPaymentError();
  }

  // Event errors
  if (error instanceof EventNotFoundError || userState.includes('event')) {
    return MessageTemplates.getEventLoadError();
  }

  // Ticket errors
  if (error instanceof TicketError || userState.includes('ticket')) {
    if (error.message.includes('not found')) {
      return MessageTemplates.getTicketError('not_found');
    }
    if (error.message.includes('generation') || error.message.includes('create')) {
      return MessageTemplates.getTicketError('generation');
    }
    return MessageTemplates.getTicketError();
  }

  // Search errors
  if (userState.includes('search') || operationType === 'search') {
    return MessageTemplates.getSearchError();
  }

  // Network errors
  if (error instanceof NetworkError || error.message.includes('network')) {
    return MessageTemplates.getServiceUnavailableError('our network connection');
  }

  // Default error
  return MessageTemplates.getGenericError();
}

/**
 * Smart retry mechanism for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  context?: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logger.warn(`Operation failed, attempt ${attempt}/${maxRetries}`, {
        context,
        error: lastError.message,
      });

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError!;
}

export default {
  safeAsyncOperation,
  safePaymentOperation,
  safeEventOperation,
  safeTicketOperation,
  safeSearchOperation,
  safeApiCall,
  safeSendMessage,
  getContextualErrorMessage,
  retryOperation,
};
