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
  thumb_hash?: string; // ThumbHash placeholder
  dimensions?: Dimension[] | null;
  exif_data?: Record<string, unknown> | null;
  created_at: string;
  createdAt?: string; // Alias for backward compatibility
  updated_at?: string;
  updatedAt?: string; // Alias for backward compatibility
  description_translations?: {
    zh?: string;
    en?: string;
    ms?: string;
  };
  group_id?: string | null;
  groupId?: string | null; // Alias for backward compatibility
  is_group_cover?: boolean;
  isGroupCover?: boolean; // Alias for backward compatibility
  is_pinned?: boolean; 
  isPinned?: boolean; // Alias for backward compatibility
  is_analyzing?: boolean;
  isAnalyzing?: boolean; // Alias for backward compatibility
  is_hidden?: boolean;
  group_order?: number;
  groupOrder?: number; // Alias for backward compatibility
  user_id?: string;
  userId?: string; // Alias for backward compatibility
  type?: string;
  uri?: string; 
  category_id: string | null; 
  categoryId?: string | null; // Alias for backward compatibility
  manufacturer_id: string | null;
  manufacturerId?: string | null; // Alias for backward compatibility
  tag_ids: string[]; 
  tagIds?: string[]; // Alias for backward compatibility
  price?: string;
  note?: string;
  sub_category?: string | null;
  _time?: number; 
  created_at_timestamp?: number; 
  createdAtTimestamp?: number; // Alias for backward compatibility
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
  usageCount?: number;
  isGlobal?: boolean;
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
  category_id: string | null;
  categoryId?: string | null; // Alias for backward compatibility
  manufacturer_id: string | null;
  manufacturerId?: string | null; // Alias for backward compatibility
  tag_ids: string[];
  tagIds?: string[]; // Alias for backward compatibility
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
  is_group_cover: boolean;
  isGroupCover?: boolean; // Alias for backward compatibility
}
