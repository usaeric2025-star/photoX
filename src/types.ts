/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DB_Category {
  id: number;
  code: string;
  zh: string;
  en: string;
  ms: string;
  sort_order: number;
}

export interface SubCategory {
  id: string;
  name: string;
  aliases: string[]; // For multilingual search
}

export interface Category {
  id: string;
  name: string;
  aliases: string[];
  subcategories: SubCategory[];
  userId?: string;
}

export interface Tag {
  id: string;
  name: string;
  aliases: string[];
  userId?: string;
}

export interface Photo {
  id: string; // Database UUID
  storageId?: string; // Filename for Supabase Storage
  item_code: string; // System auto-code (FUR-YYYYMMDD-RAND)
  manual_code?: string; // Hidden price code
  model_number?: string; // Manufacturer model number
  image_hash: string; // MD5 fingerprint
  name: string; // AI generated name
  category: string; // Main category name
  sub_category?: string; // Sub category name
  tags: string[]; // Tag array
  description?: string; // AI generated description
  image_url: string; // Public URL in Storage
  thumb_url?: string; // Thumbnail URL in Storage
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    label?: string;
    isAI?: boolean;
  }[] | null;
  exif_data?: any | null;
  createdAt: string;
  updatedAt?: string;
  groupId?: string | null;
  isGroupCover?: boolean; // New field
  isAnalyzing?: boolean;
  isHidden?: boolean;
  userId?: string;
  // UI legacy fields mapping if needed
  uri?: string; // For local preview
  categoryId?: string | null; // For local filter
  subcategoryId?: string | null; // For local filter
  tagIds?: string[]; // For local filter
  price?: string;
}

export interface ProductFormData {
  name: string;
  categoryId: string | null;
  subcategoryId: string | null;
  tagIds: string[];
  description: string;
  manual_code: string;
  model_number: string;
  dimensions: {
    label?: string;
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    isAI?: boolean;
  }[];
  isHidden: boolean;
  price: string;
  // Temporary single dim fields if needed for backward compatibility or simple UI
  dimL?: string;
  dimW?: string;
  dimH?: string;
}

export interface AppState {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
}
