import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';

import {
  handleVerification,
  handleIncomingMessage,
} from './handlers/webhookHandler.js';
import { config, validateConfig } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorMiddleware } from './utils/errorHandler.js';

// Validate configuration on startup
validateConfig();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  })
);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// WhatsApp webhook endpoints
app.get('/webhook', handleVerification);
app.post('/webhook', handleIncomingMessage);

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use(errorMiddleware);

const server = app.listen(config.PORT, () => {
  logger.info(`Webhook server is listening on port ${config.PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
