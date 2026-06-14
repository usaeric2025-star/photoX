-- P0-1: AI Audit Log Table
-- Purpose: Track AI pipeline performance, costs, and token usage.

CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    task TEXT NOT NULL, -- e.g. 'analyze', 'translate', 'agnes_retranslate'
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    
    prompt JSONB,
    response JSONB,
    
    latency_ms INTEGER,
    
    token_usage JSONB, -- { prompt_tokens: number, completion_tokens: number, total_tokens: number }
    cost_est NUMERIC(10, 6),
    
    status TEXT NOT NULL, -- 'success', 'error'
    error_message TEXT,
    
    request_metadata JSONB -- metadata like photoId, userId for correlation
);

-- Index for analytics performance
CREATE INDEX IF NOT EXISTS idx_ai_audit_task ON public.ai_audit_logs(task);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON public.ai_audit_logs(created_at DESC);

-- RLS (Row Level Security) - Only accessible to authenticated admins via service role
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- P0-2: Photo AI Results Table (DEPRECATED)
-- Purpose: Store raw AI output for debugging and potential re-parsing/re-processing.
DROP TABLE IF EXISTS public.photo_ai_results;


-- P0-6: Referential Integrity (Hardening)
-- Ensure that deleting a group, category, or manufacturer doesn't delete the furniture items.
ALTER TABLE public.furniture_items 
DROP CONSTRAINT IF EXISTS furniture_items_group_id_fkey,
ADD CONSTRAINT furniture_items_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

-- P1-1: Performance Indexes
-- Critical for high-latency group detail page filtering and count operations.
CREATE INDEX IF NOT EXISTS idx_furniture_items_group_id ON public.furniture_items(group_id);
CREATE INDEX IF NOT EXISTS idx_furniture_items_is_hidden ON public.furniture_items(is_hidden) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_furniture_items_category_id ON public.furniture_items(category_id);

ALTER TABLE public.furniture_items 
DROP CONSTRAINT IF EXISTS furniture_items_category_id_fkey,
ADD CONSTRAINT furniture_items_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.furniture_items 
DROP CONSTRAINT IF EXISTS furniture_items_manufacturer_id_fkey,
ADD CONSTRAINT furniture_items_manufacturer_id_fkey 
FOREIGN KEY (manufacturer_id) REFERENCES public.manufacturers(id) ON DELETE SET NULL;
