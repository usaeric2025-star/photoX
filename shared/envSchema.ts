import { logger } from '../api/_lib/logger.js';
import * as v from 'valibot';

/**
 * [ENV-SCHEMA-DEFINED] Client-side Environment Schema
 * Represents variables available via import('meta').env
 */
export const clientEnvSchema = v.object({
  "VITE_SUPABASE_URL": v.optional(v.string()),
  "VITE_SUPABASE_ANON_KEY": v.optional(v.string()),
  "VITE_SENTRY_DSN": v.optional(v.string()),
  "VITE_WHATSAPP_NUMBER": v.optional(v.string()),
  "VITE_THUMBNAIL_WORKER_URL": v.optional(v.string()),
  "MODE": v.optional(v.string()),
  "DEV": v.optional(v.boolean()),
  "PROD": v.optional(v.boolean())
});

/**
 * [ENV-SCHEMA-DEFINED] Server-side Environment Schema
 * Represents variables available via process.env
 */
export const serverEnvSchema = v.object({
  NODE_ENV: v.optional(v.union([v.literal('development'), v.literal('production'), v.literal('test'), v.string()])),
  PORT: v.optional(v.union([v.string(), v.number(), v.undefined()])),
  
  // Supabase
  VITE_SUPABASE_URL: v.optional(v.string()), 
  VITE_SUPABASE_ANON_KEY: v.optional(v.string()),
  SUPABASE_URL: v.optional(v.string()),
  SUPABASE_SERVICE_KEY: v.optional(v.string()),
  DATABASE_URL: v.optional(v.string()),

  // R2 Storage
  R2_ENDPOINT: v.optional(v.string()),
  R2_ACCESS_KEY_ID: v.optional(v.string()),
  R2_SECRET_ACCESS_KEY: v.optional(v.string()),
  R2_BUCKET_NAME: v.optional(v.string()),
  R2_PUBLIC_URL_PREFIX: v.optional(v.string()),

  // Agnes AI
  AGNES_API_KEY: v.optional(v.string()),
  ENCRYPTION_KEY: v.optional(v.string()),
  
  // Other flags
  VERCEL: v.optional(v.union([v.string(), v.undefined()])),
  DISABLE_HMR: v.optional(v.union([v.string(), v.undefined()])),
  VITE_THUMBNAIL_WORKER_URL: v.optional(v.string()),
  VITE_SENTRY_DSN: v.optional(v.string()),
  SENTRY_DSN: v.optional(v.string())
});

export type ServerEnv = v.InferOutput<typeof serverEnvSchema>;

const aiDebugHints: Record<string, string> = {
  "AGNES_API_KEY": "Agnes AI API Key for photo analysis.",
  "R2_ACCESS_KEY_ID": "Cloudflare R2 Access Key ID",
  "R2_SECRET_ACCESS_KEY": "Cloudflare R2 Secret Access Key",
};

/**
 * Validates and exports parsed server environment
 */
export function getServerEnv(envObj: NodeJS.ProcessEnv): ServerEnv {
  try {
    const rawEnv = { ...envObj };
    const result = v.safeParse(serverEnvSchema, rawEnv);
    if (!result.success) {
      const summary = result.issues[0].message;
      if (envObj.NODE_ENV === 'production') {
        logger.error("❌ [ENV-CRITICAL] Invalid production environment:", summary);
      } else {
        logger.warn("⚠️ [ENV-VALIDATION] Environment mismatch:", summary);
      }
      return rawEnv as ServerEnv;
    }
    return result.output as ServerEnv;
  } catch (e) {
    logger.error("[EnvSchema] Critical error during validation:", e);
    return envObj as unknown as ServerEnv;
  }
}
