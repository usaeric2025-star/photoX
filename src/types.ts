/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubCategory {
  id: string;
  name: string;
  aliases: string[]; // For multilingual search
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
}

export interface Tag {
  id: string;
  name: string;
  aliases: string[];
  userId?: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  aliases: string[];
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
  groupOrder?: number; // Order within group
  isAnalyzing?: boolean;
  isHidden?: boolean;
  userId?: string;
  // UI legacy fields mapping if needed
  uri?: string; // For local preview
  categoryId: string | null; // For local filter
  manufacturerId: string | null;
  tagIds: string[]; // For local filter
  price?: string;
}

export interface ProductFormData {
  name: string;
  categoryId: string | null;
  manufacturerId: string | null;
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
  isGroupCover: boolean;
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
