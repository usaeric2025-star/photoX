import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as views from './views.js';
import { getServerEnv } from '../../../shared/envSchema.js';

const env = getServerEnv(process.env);

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  // If we don't have a database URL, we provide a dummy db or throw if in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }
}

const client = postgres(connectionString || '', {
  max: env.NODE_ENV === 'production' ? 3 : 5, // Reduce max connections per container
  idle_timeout: 20, // Close idle connections quickly
  connect_timeout: 10,
  prepare: false, // Required for PgBouncer/Supabase
  onnotice: () => {},
});

export const db = drizzle(client, { schema: { ...schema, ...views }, casing: 'snake_case' });
export * from './schema.js';
export * from './views.js';
