import { type } from "arktype";

/**
 * [ENV-SCHEMA-DEFINED] Server-side Environment Schema
 * Represents variables available via process.env
 */
export const serverEnvSchema = type({
  "NODE_ENV?": "'development' | 'production' | 'test' | string",
  "PORT?": "string | number | undefined",
  
  // Supabase
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
  "DISABLE_HMR?": "string | undefined",
  "VITE_THUMBNAIL_WORKER_URL?": "string"
});

export type ServerEnv = typeof serverEnvSchema.infer;

const aiDebugHints: Record<string, string> = {
  "GEMINI_API_KEY": "Google AI Studio API Key for photo analysis.",
  "R2_ACCESS_KEY_ID": "Cloudflare R2 Access Key ID",
  "R2_SECRET_ACCESS_KEY": "Cloudflare R2 Secret Access Key",
};

/**
 * Validates and exports parsed server environment
 */
export function getServerEnv(envObj: NodeJS.ProcessEnv): ServerEnv {
  const rawEnv = { ...envObj };
  const result = serverEnvSchema(rawEnv);
  if (result instanceof type.errors) {
    console.warn("⚠️ [ENV-VALIDATION-INTEGRATED] Invalid Server Environment Variables (Falling back gracefully):");
    result.forEach((err) => {
      const hint = aiDebugHints[err.path.join('.')] || "Check env configuration or deployment variables";
      console.warn(`- ${err.path}: ${err.message} (hint: ${hint})`);
    });
    return rawEnv as ServerEnv;
  }
  return result as ServerEnv;
}
