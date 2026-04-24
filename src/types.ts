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
  image_hash: string; // MD5 fingerprint
  name: string; // AI generated name
  category: string; // Main category name
  sub_category?: string; // Sub category name
  tags: string[]; // Tag array
  description?: string; // AI generated description
  image_url: string; // Public URL in Storage
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  } | null;
  exif_data?: any | null;
  createdAt: string;
  groupId?: string | null;
  isAnalyzing?: boolean;
  userId?: string;
  // UI legacy fields mapping if needed
  uri?: string; // For local preview
  categoryId?: string | null; // For local filter
  subcategoryId?: string | null; // For local filter
  tagIds?: string[]; // For local filter
}

export interface AppState {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
}
