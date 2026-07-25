import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { getServerEnv } from '../../../shared/envSchema.js';
import { logger } from '../logger.js';

// Reuse the postgres client and drizzle db across invocations in serverless/development
const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
  drizzleDb: PostgresJsDatabase<typeof schema> | undefined;
};

// Lazy initialization function
function getDb(): PostgresJsDatabase<typeof schema> {
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

  const clientOptions: any = {
    max: maxConnections,
    idle_timeout: isServerless ? 5 : 10,
    connect_timeout: 25, // 25s to fail fast
    prepare: false,
    parameters: {
      statement_timeout: 15000 // 15s query timeout (hard limit)
    },
    onnotice: () => {},
  };

  if (!globalForDb.postgresClient) {
    logger.debug(`[DB] Initializing client with max=${maxConnections}, isServerless=${isServerless}`);
    const client = postgres(connectionString, {
      ...clientOptions,
      keep_alive: 30, // 30s TCP keep-alive
    });

    // Timeout Hardening: Warm up the pooler connection with retry capability
    import('../utils/timeout.js').then(({ pingDbWithRetry }) => {
      const dbProxy = { execute: () => client`SELECT 1` };
      const sqlDummy = (strings: any) => strings;
      return pingDbWithRetry(dbProxy, sqlDummy, 3, 1000);
    }).then(() => {
      logger.info('✅ [DB] Connection established and verified (SELECT 1)');
    }).catch(err => {
      logger.warn('⚠️ [DB] Initial background connection warmup warning:', err instanceof Error ? err.message : String(err));
    });

    globalForDb.postgresClient = client;
  }

  globalForDb.drizzleDb = drizzle(globalForDb.postgresClient, {
    schema: { ...schema },
    casing: 'snake_case'
  });

  return globalForDb.drizzleDb;
}

// Graceful shutdown function to close Postgres connection pool in serverless/container environments
async function closeDbConnection() {
  if (globalForDb.postgresClient) {
    try {
      const client = globalForDb.postgresClient;
      globalForDb.postgresClient = undefined;
      globalForDb.drizzleDb = undefined;
      await client.end({ timeout: 2 });
      logger.info('🔌 [DB] Database connection pool closed gracefully.');
    } catch (err) {
      logger.error('❌ [DB-ERROR] Error closing database connection pool:', err);
    }
  }
}

// Register termination listeners for clean container exits
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    logger.info('📥 [DB] Received SIGTERM signal. Initiating graceful shutdown...');
    closeDbConnection().finally(() => {
      process.exit(0);
    });
  });
  process.on('SIGINT', () => {
    logger.info('📥 [DB] Received SIGINT signal. Initiating graceful shutdown...');
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

