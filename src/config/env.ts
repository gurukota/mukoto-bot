import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

interface Config {
  NODE_ENV: string;
  STATUS: string;
  PORT: number;
  DATABASE_URL: string;
  WA_VERIFY_TOKEN: string;
  WA_ACCESS_TOKEN: string;
  WA_PHONE_NUMBER_ID: string;
  WA_BUSINESS_ID: string;
  WA_API_VERSION: string;
  PAYNOW_INTEGRATION_ID: string;
  PAYNOW_INTEGRATION_KEY: string;
  AWS_S3_BUCKET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  LOG_LEVEL: number;
}

function getRequiredEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue = ''): string {
  return process.env[key] || defaultValue;
}

function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    logger.warn(`Invalid number for ${key}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

function getPortFromEnv(): number {
  const status = process.env.STATUS;
  if (status === 'production') {
    return getNumberEnvVar('PROD_PORT', 3000);
  }
  return getNumberEnvVar('DEV_PORT', 3000);
}

export const config: Config = {
  NODE_ENV: getOptionalEnvVar('NODE_ENV', 'development'),
  STATUS: getOptionalEnvVar('STATUS', 'development'),
  PORT: getPortFromEnv(),
  DATABASE_URL: getRequiredEnvVar('DATABASE_URL'),
  WA_VERIFY_TOKEN: getRequiredEnvVar('WA_VERIFY_TOKEN'),
  WA_ACCESS_TOKEN: getRequiredEnvVar('WA_ACCESS_TOKEN'),
  WA_PHONE_NUMBER_ID: getRequiredEnvVar('WA_PHONE_NUMBER_ID'),
  WA_BUSINESS_ID: getRequiredEnvVar('WA_BUSINESS_ID'),
  WA_API_VERSION: getOptionalEnvVar('WA_API_VERSION', 'v17.0'),
  PAYNOW_INTEGRATION_ID: getRequiredEnvVar('PAYNOW_INTEGRATION_ID'),
  PAYNOW_INTEGRATION_KEY: getRequiredEnvVar('PAYNOW_INTEGRATION_KEY'),
  AWS_S3_BUCKET: getRequiredEnvVar('AWS_BUCKET_NAME'),
  AWS_ACCESS_KEY_ID: getRequiredEnvVar('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getRequiredEnvVar('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: getOptionalEnvVar('AWS_REGION', 'us-east-1'),
  LOG_LEVEL: getNumberEnvVar('LOG_LEVEL', 2),
};

// Validate configuration on startup
export function validateConfig(): void {
  logger.info('Configuration loaded successfully');
  logger.debug('Configuration:', {
    NODE_ENV: config.NODE_ENV,
    STATUS: config.STATUS,
    PORT: config.PORT,
    // Don't log sensitive data
  });
}

export default config;
