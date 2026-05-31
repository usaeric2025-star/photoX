export interface SupabasePhotoRaw {
  id: string;
  name: string;
  item_code?: string;
  manual_code?: string;
  model_number?: string;
  image_hash?: string;
  description?: string;
  image_url: string;
  thumb_url?: string;
  thumb_hash?: string;
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
  dimensions?: any;
  description_translations?: any;
  exif_data?: any;
  thumbnail_sm_url?: string;
  thumbnail_md_url?: string;
  created_at_timestamp?: number;
  group_id?: string | null;
  tags?: Array<{ id: string | number }> | null;
  // 关联字段
  categories?: { name: string } | null;
  photo_tags?: Array<{ 
    tag_id?: string | number;
    tags?: { name: string } 
  }> | null;
  group?: {
    id: string;
    name: string;
    color: string | null;
    cover_photo_id: string | null;
    member_count: number;
  } | null;
  manufacturers?: { name: string } | null;
}
