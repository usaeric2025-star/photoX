export interface Dimension {
  label: string;
  unit: 'cm' | 'inch' | 'mm';
  length: number;
  width: number;
  height: number;
  part?: string;
  isAI?: boolean;
  isAIEstimated?: boolean;
}

export interface Photo {
  id: string; // Database UUID
  storageId?: string; // Filename for Supabase Storage
  item_code: string; // System auto-code (FUR-YYYYMMDD-RAND)
  manual_code?: string; // Hidden price code
  model_number?: string; // Manufacturer model number
  image_hash: string; // MD5 fingerprint
  name: string; // AI generated name
  description?: string; // AI generated description
  image_url: string; // Public URL in Storage
  thumb_url?: string; // Thumbnail URL in Storage
  dimensions?: Dimension[] | null;
  exif_data?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
  description_translations?: {
    zh?: string;
    en?: string;
    ms?: string;
  };
  groupId?: string | null;
  isGroupCover?: boolean;
  isPinned?: boolean; 
  isAnalyzing?: boolean;
  is_hidden?: boolean;
  groupOrder?: number;
  userId?: string;
  type?: string;
  uri?: string; 
  categoryId: string | null; 
  manufacturerId: string | null;
  tagIds: string[]; 
  price?: string;
  note?: string;
  category_id?: string | null;
  sub_category?: string | null;
  _time?: number; 
  createdAtTimestamp?: number; 
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
  userId?: string;
  code?: string;
}

export interface Tag {
  id: string;
  name: string;
  zh?: string;
  en?: string;
  ms?: string;
  aliases: string[];
  userId?: string;
  isPinned?: boolean;
}

export interface Manufacturer {
  id: string;
  name: string;
  zh?: string;
  en?: string;
  ms?: string;
  aliases: string[];
}

export interface ProductGroup {
  id: string;
  name: string;
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
}

export interface ProductFormData {
  name: string;
  categoryId: string | null;
  manufacturerId: string | null;
  tagIds: string[];
  description: string;
  description_translations: {
    zh?: string;
    en?: string;
    ms?: string;
  };
  manual_code: string;
  model_number: string;
  dimensions: Dimension[];
  is_hidden: boolean;
  price: string;
  isGroupCover: boolean;
}
