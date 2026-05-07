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
  code?: string;
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

export interface Dimension {
  label: string;
  unit: 'cm' | 'inch';
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
  isGroupCover?: boolean; // New field
  isPinned?: boolean; // Pinned to top
  isAnalyzing?: boolean;
  isHidden?: boolean;
  userId?: string;
  // UI legacy fields mapping if needed
  uri?: string; // For local preview
  categoryId: string | null; // For local filter
  manufacturerId: string | null;
  tagIds: string[]; // For local filter
  price?: string;
  note?: string;
  category_id?: string | null;
  sub_category?: string | null;
  _time?: number; // Temporary UI field
}

export interface User {
  uid: string;
  id?: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
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
  cover_photo_id?: string | null;
  isHidden?: boolean;
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
  isHidden: boolean;
  price: string;
  isGroupCover: boolean;
  // Temporary single dim fields if needed for backward compatibility or simple UI
  dimL?: string;
  dimW?: string;
  dimH?: string;
}

export interface AppSettings {
  logo_url?: string;
  pinnedTags?: string[];
  hotTagsCount?: number;
  gemini_api_key?: string;
  internal_password?: string;
  custom_model?: string;
  provider?: string;
  whatsapp_1_name?: string;
  whatsapp_1?: string;
  whatsapp_2_name?: string;
  whatsapp_2?: string;
  access_passcode?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: unknown;
}

export interface AppState {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
}
