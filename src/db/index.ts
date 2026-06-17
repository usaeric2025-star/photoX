import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getServerEnv } from '../shared/envSchema';

const env = getServerEnv(process.env);

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  // If we don't have a database URL, we provide a dummy db or throw if in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }
}

const client = postgres(connectionString || '', {
  max: 1,
  prepare: false,
  onnotice: () => {},
});

export const db = drizzle(client, { schema });
export * from './schema';
