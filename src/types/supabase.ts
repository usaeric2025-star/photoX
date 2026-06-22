export interface SupabasePhotoRaw {
  id: string;
  name: string;
  item_code?: string;
  manual_code?: string;
  model_number?: string;
  image_hash?: string;
  description?: string;
  image_url: string;
  created_at: string;
  updated_at?: string;
  is_pinned?: boolean;
  is_hidden?: boolean;
  is_analyzing?: boolean;
  is_group_cover?: boolean;
  group_order?: number;
  user_id?: string;
  category_id?: string | null;
  manufacturer_id?: string | null;
  tag_ids?: string[];
  price?: string;
  sub_category?: string | null;
  dimensions?: Record<string, unknown> | null;
  description_translations?: Record<string, unknown> | null;
  exif_data?: Record<string, unknown> | null;
  thumbnail_sm_url?: string;
  thumbnail_md_url?: string;
  group_id?: string | null;
  tags?: Array<{ id: string | number }> | null;
  // 关联字段
  categories?: { name: string } | null;
  photo_tags?: Array<{ 
    tag_id?: string | number;
    tags?: { id?: string | number; name: string } | Array<{ id?: string | number; name: string }> | null;
  }> | null;
  group?: {
    id: string;
    name: string;
    color: string | null;
    cover_photo_id: string | null;
  } | null;
  manufacturers?: { name: string } | null;
  category?: { id: string | number; name: string } | null;
  manufacturer?: { id: string | number; name: string } | null;
}
