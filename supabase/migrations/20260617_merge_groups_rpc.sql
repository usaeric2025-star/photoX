-- [MIGRATION] 20260617_merge_groups_rpc.sql
-- Force replace the merge_groups RPC with a deterministic, atomic version.

CREATE OR REPLACE FUNCTION public.merge_groups(source_group_ids uuid[], target_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Ensure target group exists
    IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = target_group_id) THEN
        RAISE EXCEPTION 'Target group % does not exist', target_group_id;
    END IF;

    -- 2. Move all photos from source groups to target group
    -- Note: UI handle may have already moved some, this ensures all are moved.
    UPDATE public.furniture_items
    SET group_id = target_group_id,
        is_group_cover = false -- Reset cover status, reconciliation should handle this
    WHERE group_id = ANY(source_group_ids);

    -- 3. Delete the now-empty source groups
    DELETE FROM public.groups
    WHERE id = ANY(source_group_ids);
    
    -- Option: Log the merge for audit? (Can add to ai_audit_logs if needed)
END;
$$;
