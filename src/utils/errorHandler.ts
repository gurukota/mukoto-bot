import { Response } from 'express';
import { logger } from './logger.js';
import { conversationRecovery } from './conversationRecovery.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: string;

  constructor(message: string, statusCode = 500, isOperational = true, context?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class PaymentError extends AppError {
  constructor(message: string, context?: string) {
    super(message, 400, true, context);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: string) {
    super(message, 400, true, context);
  }
}

export class EventNotFoundError extends AppError {
  constructor(eventId?: string) {
    super(eventId ? `Event ${eventId} not found` : 'Event not found', 404);
  }
}

export class TicketError extends AppError {
  constructor(message: string, context?: string) {
    super(message, 400, true, context);
  }
}

export class NetworkError extends AppError {
  constructor(message?: string) {
    super(message || 'Network connectivity issue', 503, true, 'network');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `External service error: ${service}`, 502);
  }
}

export function handleError(error: Error, res?: Response): void {
  if (error instanceof AppError) {
    logger.error(`App Error: ${error.message}`, {
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    });

    if (res) {
      res.status(error.statusCode).json({
        error: error.message,
        statusCode: error.statusCode,
        context: error.context,
      });
    }
  } else {
    logger.error('Unexpected Error:', {
      message: error.message,
      stack: error.stack,
    });

    if (res) {
      res.status(500).json({
        error: 'Internal server error',
        statusCode: 500,
      });
    }
  }
}

// Enhanced error handler for WhatsApp conversations
export async function handleConversationError(
  error: Error,
  userId: string,
  userState: string,
  session: any,
  lastAction?: string
): Promise<void> {
  logger.error('Conversation error occurred', {
    userId,
    userState,
    lastAction,
    error: error.message,
    errorType: error.constructor.name,
  });

  // Use conversation recovery system for WhatsApp errors
  await conversationRecovery.handleError(
    userId,
    error,
    userState,
    session,
    lastAction
  );
}

export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw to be caught by express error handler
      throw error;
    }
  };
}

// Express middleware for handling async errors
export function errorMiddleware(
  error: Error,
  _req: any,
  res: Response,
  _next: any
): void {
  handleError(error, res);
}

export function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  fallback?: T,
  errorMessage?: string
): Promise<T | undefined> {
  return operation().catch(error => {
    logger.error(errorMessage || 'Async operation failed:', error);
    return fallback;
  });
}
