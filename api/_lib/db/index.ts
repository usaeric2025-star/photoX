import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { getServerEnv } from '../../../shared/envSchema.js';

// Reuse the postgres client and drizzle db across invocations in serverless/development
const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
  drizzleDb: PostgresJsDatabase<typeof schema> | undefined;
};

// Lazy initialization function
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (globalForDb.drizzleDb) {
    return globalForDb.drizzleDb;
  }

  const env = getServerEnv(process.env);
  const connectionString = env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('❌ [DB-CRITICAL] DATABASE_URL is missing in process.env! Cannot initialize database client.');
  }

  // In serverless environments like Vercel, each function invocation is short-lived.
  // To avoid exhausting connection limits while preventing Promise.all parallel query deadlocks, 
  // we set a safe connection limit of 3 for serverless, and 10 for standard containers.
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
  const maxConnections = isServerless ? 3 : 10;

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
  const finalConnectionString = appendDbParam(connectionString, 'options', '-c statement_timeout=50000');

  const clientOptions: postgres.Options<{}> = {
    max: maxConnections,
    idle_timeout: isServerless ? 5 : 10, // Close idle connections quickly within 10 seconds to avoid connection leaks
    connect_timeout: 45, // 45s to allow for cold start wake-up of database
    prepare: false, // Required for PgBouncer/Supabase transaction pooling
    onnotice: () => {},
  };

  if (!globalForDb.postgresClient) {
    globalForDb.postgresClient = postgres(finalConnectionString, {
      ...clientOptions,
      keep_alive: 30, // 30s keep-alive to prevent stale half-closed connections (unit is seconds in postgres.js)
    });
  }

  globalForDb.drizzleDb = drizzle(globalForDb.postgresClient, {
    schema: { ...schema }
  });

  return globalForDb.drizzleDb;
}

// Graceful shutdown function to close Postgres connection pool in serverless/container environments
export async function closeDbConnection() {
  if (globalForDb.postgresClient) {
    try {
      const client = globalForDb.postgresClient;
      globalForDb.postgresClient = undefined;
      globalForDb.drizzleDb = undefined;
      await client.end({ timeout: 2 });
      console.log('🔌 [DB] Database connection pool closed gracefully.');
    } catch (err) {
      console.error('❌ [DB-ERROR] Error closing database connection pool:', err);
    }
  }
}

// Register termination listeners for clean container exits
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.info('📥 [DB] Received SIGTERM signal. Initiating graceful shutdown...');
    closeDbConnection().finally(() => {
      process.exit(0);
    });
  });
  process.on('SIGINT', () => {
    console.info('📥 [DB] Received SIGINT signal. Initiating graceful shutdown...');
    closeDbConnection().finally(() => {
      process.exit(0);
    });
  });
}

// Proxied db export for completely transparent lazy initialization
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(target, prop, receiver) {
    // Return base property if it's a Symbol (e.g. inspected by Node console or promise check)
    if (typeof prop === 'symbol') {
      return Reflect.get(target, prop, receiver);
    }
    const database = getDb();
    const value = Reflect.get(database, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    const database = getDb();
    return Reflect.set(database, prop, value, receiver);
  },
  has(target, prop) {
    const database = getDb();
    return Reflect.has(database, prop);
  },
  ownKeys(target) {
    const database = getDb();
    return Reflect.ownKeys(database);
  },
  getOwnPropertyDescriptor(target, prop) {
    const database = getDb();
    return Reflect.getOwnPropertyDescriptor(database, prop);
  }
});

export * from './schema.js';

