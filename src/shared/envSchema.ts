import { logger } from '@/lib/logger';
import * as v from 'valibot';

/**
 * [ENV-SCHEMA-DEFINED] Client-side Environment Schema
 * Represents variables available via import('meta').env
 */
export const clientEnvSchema = v.object({
  "VITE_SUPABASE_URL": v.optional(v.string()),
  "VITE_SUPABASE_ANON_KEY": v.optional(v.string()),
  "VITE_SENTRY_DSN": v.optional(v.string()),
  "MODE": v.optional(v.string()),
  "DEV": v.optional(v.boolean()),
  "PROD": v.optional(v.boolean())
});

/**
 * [ENV-SCHEMA-DEFINED] Server-side Environment Schema
 * Represents variables available via process.env
 */
export const serverEnvSchema = v.object({
  "NODE_ENV": v.optional(v.union([v.literal('development'), v.literal('production'), v.literal('test'), v.string()])),
  "PORT": v.optional(v.union([v.string(), v.number()])),
  
  // Supabase (Server requires either VITE_... or SUPABASE_...)
  "VITE_SUPABASE_URL": v.optional(v.string()), 
  "VITE_SUPABASE_ANON_KEY": v.optional(v.string()),
  "SUPABASE_URL": v.optional(v.string()),
  "SUPABASE_SERVICE_KEY": v.optional(v.string()),
  "DATABASE_URL": v.optional(v.string()),

  // R2 Storage
  "R2_ENDPOINT": v.optional(v.string()),
  "R2_ACCESS_KEY_ID": v.optional(v.string()),
  "R2_SECRET_ACCESS_KEY": v.optional(v.string()),
  "R2_BUCKET_NAME": v.optional(v.string()),
  "R2_PUBLIC_URL_PREFIX": v.optional(v.string()),

  // Gemini AI
  "GEMINI_API_KEY": v.optional(v.string()),
  
  // Sentry
  "SENTRY_DSN": v.optional(v.string()),
  "VITE_SENTRY_DSN": v.optional(v.string()),
  
  // Other flags
  "VERCEL": v.optional(v.string()),
  "DISABLE_HMR": v.optional(v.string())
});

// Infer types
export type ClientEnv = v.InferOutput<typeof clientEnvSchema>;
type ServerEnv = v.InferOutput<typeof serverEnvSchema>;

const aiDebugHints: Record<string, string> = {
  "VITE_SUPABASE_URL": "Supabase Project URL. Get it from Project Settings -> API.",
  "VITE_SUPABASE_ANON_KEY": "Supabase Public Anon Key. Get it from Project Settings -> API.",
  "GEMINI_API_KEY": "Google AI Studio API Key for photo analysis.",
  "R2_ACCESS_KEY_ID": "Cloudflare R2 Access Key ID",
  "R2_SECRET_ACCESS_KEY": "Cloudflare R2 Secret Access Key",
};

/**
 * Validates and exports parsed client environment
 */
export function getClientEnv(): ClientEnv {
  if (typeof window === "undefined") {
    return {} as ClientEnv;
  }
  
  const rawEnv: Record<string, unknown> = typeof import.meta !== 'undefined' && import.meta.env ? { ...import.meta.env } : {};
  const filteredEnv: Partial<ClientEnv> = {};
  const allowedKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SENTRY_DSN', 'MODE', 'DEV', 'PROD'] as const;
  allowedKeys.forEach(key => {
    if (rawEnv[key] !== undefined) {
      filteredEnv[key as unknown as keyof ClientEnv] = rawEnv[key] as never;
    }
  });

  const validation = v.safeParse(clientEnvSchema, filteredEnv);
  if (!validation.success) {
    logger.warn("⚠️ [ENV-VALIDATION-INTEGRATED] Invalid Client Environment Variables (Falling back gracefully):");
    validation.issues.forEach((issue) => {
      const path = issue.path?.map((p: any) => p.key).join('.') || 'unknown';
      const hint = aiDebugHints[path] || "Check .env configuration";
      logger.warn(`- ${path}: ${issue.message} (aiDebugHint: ${hint})`);
    });
    return filteredEnv as ClientEnv;
  }
  return validation.output;
}

/**
 * Validates and exports parsed server environment
 */
export function getServerEnv(envObj: NodeJS.ProcessEnv): ServerEnv {
  const rawEnv = { ...envObj };
  const validation = v.safeParse(serverEnvSchema, rawEnv);
  if (!validation.success) {
    logger.warn("⚠️ [ENV-VALIDATION-INTEGRATED] Invalid Server Environment Variables (Falling back gracefully):");
    validation.issues.forEach((issue) => {
      const path = issue.path?.map((p: any) => p.key).join('.') || 'unknown';
      const hint = aiDebugHints[path] || "Check .env configuration or deployment env variables";
      logger.warn(`- ${path}: ${issue.message} (aiDebugHint: ${hint})`);
    });
    return rawEnv as ServerEnv;
  }
  return validation.output;
}

export const clientEnv = getClientEnv();
