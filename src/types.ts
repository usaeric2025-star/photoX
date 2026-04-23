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
  id: string;
  uri: string; // Base64 image data
  categoryId: string | null;
  subcategoryId: string | null;
  tagIds: string[];
  note: string;
  createdAt: string;
  groupId?: string | null;
  isAnalyzing?: boolean;
  userId?: string;
}

export interface AppState {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
}
