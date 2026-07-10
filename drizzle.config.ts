import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: ['./api/_lib/db/schema.ts'],
  out: './supabase/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
