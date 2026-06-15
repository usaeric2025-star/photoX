-- [MIGRATION] 20260615_tag_hot_scores.sql
-- Purpose: Add hot_score column and refresh function for tags popularity.

-- 1. Add hot_score column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'hot_score') THEN
        ALTER TABLE public.tags ADD COLUMN hot_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create index for hot tags
CREATE INDEX IF NOT EXISTS idx_tags_hot_score ON public.tags(hot_score DESC);

-- 3. Create RPC to refresh hot scores based on usage in photo_tags
CREATE OR REPLACE FUNCTION public.refresh_tag_hot_scores()
RETURNS void AS $$
BEGIN
    UPDATE public.tags t
    SET hot_score = (
        SELECT count(*)
        FROM public.photo_tags pt
        WHERE pt.tag_id = t.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
