import { Response } from 'express';
import { logger } from './logger.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
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
      stack: error.stack,
    });

    if (res) {
      res.status(error.statusCode).json({
        error: error.message,
        statusCode: error.statusCode,
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
