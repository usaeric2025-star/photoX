import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { getServerEnv } from '@/shared/envSchema.js';

const env = getServerEnv(process.env);

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  // If we don't have a database URL, we provide a dummy db or throw if in production
  console.error('❌ [DB-CRITICAL] DATABASE_URL is missing in process.env!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }
} else {
    console.log('✅ [DB-INFO] DATABASE_URL successfully loaded (length:', connectionString.length, ')');
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

// Function to append query parameters to connection string
function appendDbParam(url: string, key: string, value: string) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    // Fallback for non-standard formats
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${key}=${encodeURIComponent(value)}`;
  }
}

// Ensure statement_timeout is set at the connection level
const finalConnectionString = appendDbParam(connectionString || '', 'options', '-c statement_timeout=35000');

const clientOptions: postgres.Options<{}> = {
  max: maxConnections,
  idle_timeout: isServerless ? 5 : 10, // Close idle connections quickly within 10 seconds to avoid connection leaks
  connect_timeout: 20, // 20s as requested
  prepare: false, // Required for PgBouncer/Supabase transaction pooling
  onnotice: () => {},
};

if (!globalForDb.postgresClient && connectionString) {
  globalForDb.postgresClient = postgres(finalConnectionString, {
    ...clientOptions,
    keep_alive: 30000, // 30s keep-alive to prevent stale half-closed connections
  });
}

const client = globalForDb.postgresClient || postgres(finalConnectionString || '', clientOptions);

if (!globalForDb.drizzleDb && connectionString) {
  globalForDb.drizzleDb = drizzle(client, { 
    schema: { ...schema },
    casing: 'camelCase'
  });
}

export const db = globalForDb.drizzleDb || drizzle(client, { 
  schema: { ...schema },
  casing: 'camelCase'
});

export * from './schema.js';

