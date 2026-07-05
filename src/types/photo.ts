export interface Dimension {
  label: string;
  unit: 'cm' | 'inch' | 'mm';
  length: number;
  width: number;
  height: number;
  part?: string;
  isAi?: boolean;
  isAiEstimated?: boolean;
}

export interface Photo {
  id: string; // Database UUID
  _fileSize?: number;
  _fileName?: string;
  _lastModified?: number;
  storageId?: string; // Filename for Supabase Storage
  itemCode: string; // System auto-code (FUR-YYYYMMDD-RAND)
  manualCode?: string; // Hidden price code
  modelNumber?: string; // Manufacturer model number
  imageHash: string; // MD5 fingerprint
  name: string;
  description: {
    zh: string;
    en?: string;
    ms?: string;
  } | null;
  imageUrl: string; // Public URL in Storage
  width?: number; // Pixel width
  height?: number; // Pixel height
  thumbnailSmUrl?: string; // w=120 (Standard for grid/cards)
  thumbnailMdUrl?: string; // w=400 (Standard for medium grid)
  thumbnailLgUrl?: string; // w=800 (Standard for lightbox/fullscreen)
  dimensions?: Dimension[] | null;
  createdAt: string;
  updatedAt?: string;
  groupId?: string | null;
  isGroupCover?: boolean;
  isPinned?: boolean; 
  isAnalyzing?: boolean;
  isAiDescribed?: boolean;
  isHidden?: boolean;
  groupOrder?: number;
  userId?: string;
  type?: string;
  uri?: string; 
  categoryId: string | null; 
  manufacturerId: string | null;
  tags?: Tag[]; 
  price?: string;
  note?: string;
  subCategory?: string | null;
  _time?: number; 
  aiFailed?: boolean;
  metadata?: Record<string, unknown>;
  group?: {
      id: string;
      name: string;
      color: string | null;
      coverPhotoId: string | null;
      memberCount?: number; // Calculated, not persisted
      status?: 'confirmed' | 'rejected' | 'active';
  } | null;
  categoryName: string;
  manufacturerName: string;
  [key: string]: unknown;
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
  userId?: string;
  code?: string;
  sortOrder?: number;
}

export interface Tag {
  id: number;
  name: string;
  aliases?: string[];
  userId?: string;
  isPinned?: boolean;
  hotScore?: number;
  isGlobal?: boolean;
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
  coverPhotoId?: string | null;
  isHidden?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status?: 'confirmed' | 'rejected' | 'active';
  metadata?: Record<string, unknown>;
}

export type Group = ProductGroup;

export interface ProductFormData {
  id?: string;
  name: string;
  categoryId: string | null;
  manufacturerId: string | null;
  tags: Tag[];
  description: {
    zh: string;
    en?: string;
    ms?: string;
  };
  itemCode: string;
  manualCode: string;
  modelNumber: string;
  dimensions: Dimension[];
  isHidden: boolean;
  price: string;
  isGroupCover: boolean;
  groupId?: string | null;
  uri?: string;
}


export interface PhotoAIResult {
  id: string;
  photoId: string;
  rawResult?: string;
  parsedData?: Record<string, unknown>;
  createdAt?: string;
}

function isValidPhoto(photo: unknown): photo is Photo {
  const p = photo as Record<string, unknown>;
  return (
    !!p && typeof p.id === 'string'
  );
}
