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
  [key: string]: unknown;
  _fileSize?: number;
  _fileName?: string;
  _lastModified?: number;
  storage_id?: string; // Filename for Supabase Storage
  item_code: string; // System auto-code (FUR-YYYYMMDD-RAND)
  manual_code?: string; // Hidden price code
  model_number?: string; // Manufacturer model number
  image_hash: string; // MD5 fingerprint
  name: {
    zh: string;
    en?: string;
    ms?: string;
  };
  description: {
    zh: string;
    en?: string;
    ms?: string;
  } | null;
  image_url: string; // Public URL in Storage
  width?: number; // Pixel width
  height?: number; // Pixel height
  thumbnail_sm_url?: string; // w=300
  thumbnail_md_url?: string; // w=800
  dimensions?: Dimension[] | null;
  created_at: string;
  updated_at?: string;
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
  tags?: Tag[]; 
  price?: string;
  note?: string;
  sub_category?: string | null;
  _time?: number; 
  ai_failed?: boolean;
  metadata?: Record<string, unknown>;
  group?: {
      id: string;
      name: string;
      color: string | null;
      cover_photo_id: string | null;
      member_count?: number; // Calculated, not persisted
      status?: 'draft' | 'confirmed' | 'rejected';
  } | null;
  categoryName: string;
  manufacturerName: string;
}

interface SubCategory {
  id: number;
  name: string;
  aliases: string[];
}

export interface Category {
  id: number;
  name: string; // Legacy or primary name
  nameZh?: string;
  nameEn?: string;
  nameMs?: string;
  zh?: string;
  en?: string;
  ms?: string;
  aliases?: string[];
  subcategories: SubCategory[];
  user_id?: string;
  code?: string;
  sort_order?: number;
}

export interface Tag {
  id: number;
  name: string;
  aliases?: string[];
  user_id?: string;
  is_pinned?: boolean;
  hot_score?: number;
  is_global?: boolean;
}

export interface Manufacturer {
  id: string;
  name: string;
  aliases?: string[];
}

export interface ProductGroup {
  id: string;
  name: string;
  description?: string | null;
  cover_photo_id?: string | null;
  is_hidden?: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  status?: 'draft' | 'confirmed' | 'rejected';
  metadata?: Record<string, unknown>;
}

export type Group = ProductGroup;

export interface ProductFormData {
  id?: string;
  name: {
    zh: string;
    en?: string;
    ms?: string;
  };
  category_id: string | null;
  manufacturer_id: string | null;
  tags: Tag[];
  description: {
    zh: string;
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
  group_id?: string | null;
  uri?: string;
}


export interface PhotoAIResult {
  id: string;
  photo_id: string;
  raw_result?: string;
  parsed_data?: Record<string, unknown>;
  created_at?: string;
}

export function isValidPhoto(photo: unknown): photo is Photo {
  const p = photo as Record<string, unknown>;
  return (
    !!p && typeof p.id === 'string'
  );
}
