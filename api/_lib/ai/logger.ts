import { getSupabaseAdmin } from "../supabase.js";

interface AIAuditLog {
  task: string;
  model: string;
  provider: string;
  prompt: string;
  response: string;
  latency_ms: number;
  token_usage?: any;
  status: 'success' | 'error';
  error_message?: string;
  request_metadata?: any;
}

export async function saveAIAuditLog(log: AIAuditLog) {
  try {
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from('ai_audit_logs').insert({
      ...log,
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.warn(`[saveAIAuditLog] Database error: ${error.message}`);
    }
  } catch (err: any) {
    console.warn(`[saveAIAuditLog] Exception: ${err.message}`);
  }
}
