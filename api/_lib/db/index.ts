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

// In serverless environments like Vercel, each function invocation is short-lived.
// To avoid exhausting connection limits, we limit the pool size to 1.
// In non-serverless environments like Cloud Run, we allow up to 10 connections to handle parallel requests.
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const maxConnections = isServerless ? 1 : 10;

// Reuse the postgres client and drizzle db across invocations in serverless/development
const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
  drizzleDb: any | undefined;
};

if (!globalForDb.postgresClient && connectionString) {
  globalForDb.postgresClient = postgres(connectionString, {
    max: maxConnections,
    idle_timeout: isServerless ? 5 : 20, // Close idle connections quickly
    connect_timeout: 15, // Increase connect timeout to allow PgBouncer to queue if overloaded
    prepare: false, // Required for PgBouncer/Supabase transaction pooling
    onnotice: () => {},
  });
}

export const client = globalForDb.postgresClient || postgres(connectionString || '', { max: maxConnections });

if (!globalForDb.drizzleDb && connectionString) {
  globalForDb.drizzleDb = drizzle(client, { 
    schema: { ...schema, ...views }, 
    casing: 'snake_case' 
  });
}

export const db = globalForDb.drizzleDb || drizzle(client, { 
  schema: { ...schema, ...views }, 
  casing: 'snake_case' 
});

export * from './schema.js';
export * from './views.js';

