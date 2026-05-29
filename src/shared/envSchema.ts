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
  
  const rawEnv = { ...(import.meta as any).env };
  const filteredEnv: Record<string, any> = {};
  const allowedKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'MODE', 'DEV', 'PROD'];
  allowedKeys.forEach(key => {
    if (rawEnv[key] !== undefined) {
      filteredEnv[key] = rawEnv[key];
    }
  });
  if (!filteredEnv.VITE_SUPABASE_URL) {
    filteredEnv.VITE_SUPABASE_URL = "https://vbpnlkeweqkjufijtdph.supabase.co";
  }
  if (!filteredEnv.VITE_SUPABASE_ANON_KEY) {
    filteredEnv.VITE_SUPABASE_ANON_KEY = "sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8";
  }

  const result = clientEnvSchema(filteredEnv);
  if (result instanceof type.errors) {
    console.error("❌ [ENV-VALIDATION-INTEGRATED] Invalid Client Environment Variables:");
    result.forEach((err) => {
      const hint = aiDebugHints[err.path.join('.')] || "Check .env configuration";
      console.error(`- ${err.path}: ${err.message} (aiDebugHint: ${hint})`);
    });
    throw new Error(`Client Environment Contract Violation: ${result.summary}\nHint: Check your .env file and ensure variables match ArkType schema requirements.`);
  }
  return result as ClientEnv;
}

/**
 * Validates and exports parsed server environment
 */
export function getServerEnv(envObj: any): ServerEnv {
  const rawEnv = { ...envObj };
  if (!rawEnv.VITE_SUPABASE_URL) {
    rawEnv.VITE_SUPABASE_URL = "https://vbpnlkeweqkjufijtdph.supabase.co";
  }
  if (!rawEnv.VITE_SUPABASE_ANON_KEY) {
    rawEnv.VITE_SUPABASE_ANON_KEY = "sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8";
  }
  const result = serverEnvSchema(rawEnv);
  if (result instanceof type.errors) {
    console.error("❌ [ENV-VALIDATION-INTEGRATED] Invalid Server Environment Variables:");
    result.forEach((err) => {
      const hint = aiDebugHints[err.path.join('.')] || "Check .env configuration or deployment env variables";
      console.error(`- ${err.path}: ${err.message} (aiDebugHint: ${hint})`);
    });
    throw new Error(`Server Environment Contract Violation: ${result.summary}\nHint: Please provide the required environment variables in your deployment / runtime configuration.`);
  }
  return result as ServerEnv;
}

export const clientEnv = getClientEnv();
