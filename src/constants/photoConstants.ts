/**
 * Visibility filter for Supabase queries
 * Shows all to Admin/Staff, otherwise hides is_hidden
 */
export const VISIBILITY_OR_QUERY = 'is_hidden.is.null,is_hidden.eq.false';
