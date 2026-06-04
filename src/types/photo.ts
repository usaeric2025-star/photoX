export interface Dimension {
  label: string;
  unit: 'cm' | 'inch' | 'mm';
  length: number;
  width: number;
  height: number;
  part?: string;
  is_ai?: boolean;
  is_ai_estimated?: boolean;
}

export interface Photo {
  id: string; // Database UUID
  storage_id?: string; // Filename for Supabase Storage
  item_code: string; // System auto-code (FUR-YYYYMMDD-RAND)
  manual_code?: string; // Hidden price code
  model_number?: string; // Manufacturer model number
  image_hash: string; // MD5 fingerprint
  name: string; // AI generated name
  name_en?: string;
  name_ms?: string;
  description?: string; // AI generated description
  image_url: string; // Public URL in Storage
  width?: number; // Pixel width
  height?: number; // Pixel height
  thumbnail_sm_url?: string; // w=300
  thumbnail_md_url?: string; // w=800
  thumb_hash?: string; // ThumbHash placeholder
  dimensions?: Dimension[] | null;
  exif_data?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
  description_translations?: {
    zh?: string;
    en?: string;
    ms?: string;
  };
  group_id?: string | null;
  is_group_cover?: boolean;
  is_pinned?: boolean; 
  is_analyzing?: boolean;
  is_ai_described?: boolean;
  is_hidden?: boolean;
  group_order?: number;
  user_id?: string;
  type?: string;
  uri?: string; 
  category_id: string | null; 
  manufacturer_id: string | null;
  tag_ids: string[]; 
  price?: string;
  note?: string;
  sub_category?: string | null;
  _time?: number; 
  created_at_timestamp?: number; 
  ai_failed?: boolean;
  metadata?: Record<string, any>;
  group?: {
      id: string;
      name: string;
      color: string | null;
      cover_photo_id: string | null;
      member_count: number;
  } | null;
  categoryName: string;
  tagNames: string[];
  manufacturerName: string;
}

export interface SubCategory {
  id: string;
  name: string;
  aliases: string[];
}

export interface Category {
  id: string;
  name: string;
  zh?: string;
  en?: string;
  ms?: string;
  aliases: string[];
  subcategories: SubCategory[];
  user_id?: string;
  code?: string;
}

export interface Tag {
  id: string;
  name: string;
  aliases: string[];
  user_id?: string;
  is_pinned?: boolean;
  hot_score?: number;
  is_global?: boolean;
}

export interface Manufacturer {
  id: string;
  name: string;
  aliases: string[];
}

export interface ProductGroup {
  id: string;
  name: string;
  name_en?: string;
  name_ms?: string;
  description: string | null;
  description_translations?: {
    zh?: string;
    en?: string;
    ms?: string;
  };
  colors: string[];
  materials: string[];
  dimensions?: Dimension[] | null;
  cover_photo_id?: string | null;
  is_hidden?: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface ProductFormData {
  id?: string;
  name: string;
  name_en?: string;
  name_ms?: string;
  category_id: string | null;
  manufacturer_id: string | null;
  tag_ids: string[];
  description: string;
  description_translations?: {
    zh?: string;
    en?: string;
    ms?: string;
  };
  item_code: string;
  manual_code: string;
  model_number: string;
  dimensions: Dimension[];
  is_hidden: boolean;
  price: string;
  is_group_cover: boolean;
  uri?: string;
}

export interface PhotoAIResult {
  id: string;
  photo_id: string;
  raw_result?: string;
  parsed_data?: Record<string, any>;
  created_at?: string;
}
