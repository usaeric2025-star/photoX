import { logger } from '@/lib/logger';
import * as v from 'valibot';
import { clientEnvSchema as sharedClientSchema, serverEnvSchema as sharedServerSchema } from '../../api/_shared/envSchema';

export const clientEnvSchema = sharedClientSchema;
export const serverEnvSchema = sharedServerSchema;

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
      const path = issue.path?.map((p: { key: unknown }) => String(p.key)).join('.') || 'unknown';
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
      const path = issue.path?.map((p: { key: unknown }) => String(p.key)).join('.') || 'unknown';
      const hint = aiDebugHints[path] || "Check .env configuration or deployment env variables";
      logger.warn(`- ${path}: ${issue.message} (aiDebugHint: ${hint})`);
    });
    return rawEnv as ServerEnv;
  }
  return validation.output;
}

export const clientEnv = getClientEnv();
