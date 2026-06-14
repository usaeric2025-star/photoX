-- supabase/migrations/20260614_align_ai_audit_logs.sql

-- 1. 補齊效能指標欄位
ALTER TABLE ai_audit_logs
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS cost_est DECIMAL(10, 4),
  ADD COLUMN IF NOT EXISTS token_usage JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- 2. 新增完整 Raw JSON 欄位（取代 R2）
ALTER TABLE ai_audit_logs
  ADD COLUMN IF NOT EXISTS raw_output JSONB;

-- 3. 為常用查詢建立索引
CREATE INDEX IF NOT EXISTS idx_ai_audit_status ON ai_audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON ai_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_photo ON ai_audit_logs(photo_id);
