import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as views from './views.js';
import { getServerEnv } from '../../_shared/envSchema.js';

let _db: any = null;

function getDbInstance() {
  if (_db) return _db;
  
  const env = getServerEnv(process.env);
  const connectionString = env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing. Please configure it in your Vercel project environment settings.');
  }
  
  const client = postgres(connectionString, {
    max: 5,
    prepare: false,
    onnotice: () => {},
  });
  
  _db = drizzle(client, { schema: { ...schema, ...views } });
  return _db;
}

export const db = new Proxy({}, {
  get: (_target, prop) => {
    const instance = getDbInstance();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
}) as any;

export * from './schema.js';
export * from './views.js';
