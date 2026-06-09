import { getSupabaseAdmin } from "../supabase.js";

export interface AIAuditLog {
  task: string;
  model: string;
  provider: string;
  prompt: string | any;
  response: string | any;
  latency_ms: number;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost_est?: number;
  status: 'success' | 'error';
  error_message?: string;
  request_metadata?: any;
}

/**
 * Saves an AI audit log to database and optionally R2 (for cold storage)
 */
export async function saveAIAuditLog(log: AIAuditLog) {
  try {
    const supabase = await getSupabaseAdmin();
    
    // 1. Save to database (Hot storage)
    const { error } = await supabase
      .from('ai_audit_logs')
      .insert({
        ...log,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('⚠️ [AI-LOGGER-DB-FAILED] Failed to save AI audit log to DB:', error.message);
      // We don't throw here to avoid failing the business logic just because logging failed
    }

    // 2. R2 Cold Storage is handled by a background task/cron if logs get too large
    // For now, we rely on DB logs
  } catch (e: any) {
    console.error('❌ [AI-LOGGER-CRITICAL] Global failure in AI audit logging:', e.message);
  }
}
