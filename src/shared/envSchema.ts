import { type } from "arktype";

/**
 * [ENV-SCHEMA-DEFINED] Client-side Environment Schema
 * Represents variables available via import('meta').env
 */
export const clientEnvSchema = type({
  "VITE_SUPABASE_URL?": "string",
  "VITE_SUPABASE_ANON_KEY?": "string",
  "MODE?": "string",
  "DEV?": "boolean",
  "PROD?": "boolean"
});

/**
 * [ENV-SCHEMA-DEFINED] Server-side Environment Schema
 * Represents variables available via process.env
 */
export const serverEnvSchema = type({
  "NODE_ENV?": "'development' | 'production' | 'test' | string",
  "PORT?": "string | number | undefined",
  
  // Supabase (Server requires either VITE_... or SUPABASE_...)
  "VITE_SUPABASE_URL?": "string", 
  "VITE_SUPABASE_ANON_KEY?": "string",
  "SUPABASE_URL?": "string",
  "SUPABASE_SERVICE_KEY?": "string",

  // R2 Storage
  "R2_ENDPOINT?": "string",
  "R2_ACCESS_KEY_ID?": "string",
  "R2_SECRET_ACCESS_KEY?": "string",
  "R2_BUCKET_NAME?": "string",
  "R2_PUBLIC_URL_PREFIX?": "string",

  // Gemini AI
  "GEMINI_API_KEY?": "string",
  
  // Other flags
  "VERCEL?": "string | undefined",
  "DISABLE_HMR?": "string | undefined"
});

// Infer types
export type ClientEnv = typeof clientEnvSchema.infer;
export type ServerEnv = typeof serverEnvSchema.infer;

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
  const allowedKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'MODE', 'DEV', 'PROD'] as const;
  allowedKeys.forEach(key => {
    if (rawEnv[key] !== undefined) {
      filteredEnv[key as keyof ClientEnv] = rawEnv[key] as any;
    }
  });

  const result = clientEnvSchema(filteredEnv);
  if (result instanceof type.errors) {
    console.warn("⚠️ [ENV-VALIDATION-INTEGRATED] Invalid Client Environment Variables (Falling back gracefully):");
    result.forEach((err) => {
      const hint = aiDebugHints[err.path.join('.')] || "Check .env configuration";
      console.warn(`- ${err.path}: ${err.message} (aiDebugHint: ${hint})`);
    });
    return filteredEnv as ClientEnv;
  }
  return result as ClientEnv;
}

/**
 * Validates and exports parsed server environment
 */
export function getServerEnv(envObj: NodeJS.ProcessEnv): ServerEnv {
  const rawEnv = { ...envObj };
  const result = serverEnvSchema(rawEnv);
  if (result instanceof type.errors) {
    console.warn("⚠️ [ENV-VALIDATION-INTEGRATED] Invalid Server Environment Variables (Falling back gracefully):");
    result.forEach((err) => {
      const hint = aiDebugHints[err.path.join('.')] || "Check .env configuration or deployment env variables";
      console.warn(`- ${err.path}: ${err.message} (aiDebugHint: ${hint})`);
    });
    return rawEnv as ServerEnv;
  }
  return result as ServerEnv;
}

export const clientEnv = getClientEnv();
