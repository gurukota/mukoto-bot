import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  logger.debug('Database connection established');
});

pool.on('error', err => {
  logger.error('Database connection error:', err);
});

export const db = drizzle({ client: pool, schema });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Closing database connections...');
  await pool.end();
});

export { pool };
