/**
 * Unified Query Fields for Photo Resource
 * [LAZINESS-CONTRACT-ENFORCED] Fully explicit, no select '*' or wildcards.
 */

// List query fields - minimum set of physical columns required to render galleries and list views
// NOTE: thumbnail_sm_url and thumbnail_md_url are designated as VIRTUAL_FIELDS and mapped client-side, do not query them.
export const PHOTO_LIST_FIELDS = 'id, name, item_code, manual_code, model_number, price, description, image_url, created_at, updated_at, group_id, is_group_cover, is_hidden, is_pinned, is_analyzing, user_id, category_id, manufacturer_id, dimensions, description_translations, photo_tags(tag_id)';

// Detail query fields - comprehensive set of physical columns used for editing and detailed views
export const PHOTO_DETAIL_FIELDS = 'id, name, item_code, manual_code, model_number, image_hash, category_id, manufacturer_id, sub_category, description, image_url, created_at, updated_at, group_id, is_group_cover, is_hidden, is_pinned, is_analyzing, user_id, price, description_translations, dimensions, group_order, photo_tags(tag_id)';

// Virtual fields that are computed client-side or mapped from image_url and not present in DB
export const VIRTUAL_FIELDS = ['thumbnail_sm_url', 'thumbnail_md_url'];
