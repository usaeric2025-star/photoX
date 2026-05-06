import React from 'react';
import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { Photo } from '../types';
import { createKeyedCache } from './cacheUtils';
import { normalizeSearchQuery } from '../utils/stringHelper';

export const photoCache = createKeyedCache<Photo[]>();

export function mapSupabasePhoto(item: Record<string, unknown>): Photo {
    if (!item) return {} as Photo;
    
    // Extract storageId from image_url if possible
    let storageId = item.id as string;
    if (item.image_url) {
      try {
        const parts = (item.image_url as string).split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          storageId = lastPart.split('.')[0];
        }
      } catch (e) {
        // Suppress warning
      }
    }

    let tagIds: string[] = [];
    if (Array.isArray(item.photo_tags)) {
      tagIds = item.photo_tags
        .map((pt: any) => {
          if (pt == null) return null;
          if (typeof pt === 'object') {
            const typedPt = pt as Record<string, any>;
            if (typedPt.tag_id != null) return String(typedPt.tag_id);
            if (typedPt.tags && (typedPt.tags as Record<string, any>).id != null) return String((typedPt.tags as Record<string, any>).id);
            if (typedPt.id != null) return String(typedPt.id);
          }
          return String(pt);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    } else if (Array.isArray(item.tags)) {
      // Fallback in case tags are returned directly
      tagIds = (item.tags as any[])
        .map((t: any) => {
          if (t == null) return null;
          if (typeof t === 'object' && (t as Record<string, any>).id != null) return String((t as Record<string, any>).id);
          return String(t);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    }

    return {
      id: item.id as string,
      storageId: storageId,
      item_code: item.item_code as string | undefined,
      manual_code: item.manual_code as string | undefined,
      model_number: item.model_number as string | undefined,
      image_hash: item.image_hash as string | undefined,
      name: (item.name as string) || 'Unnamed Product',
      categoryId: item.category_id ? String(item.category_id) : null,
      manufacturerId: item.manufacturer_id ? String(item.manufacturer_id) : null,
      tagIds,
      description: item.description as string | undefined,
      image_url: item.image_url as string | undefined,
      thumb_url: (item.thumb_url as string) || (item.image_url as string),
      dimensions: Array.isArray(item.dimensions) ? (item.dimensions as Photo['dimensions']) : [],
      exif_data: (item.exif_data as Record<string, unknown>) ?? null,
      createdAt: item.created_at as string | undefined,
      groupId: item.group_id ? String(item.group_id) : undefined,
      isGroupCover: !!item.is_group_cover,
      groupOrder: Number(item.group_order) || Number(item.created_at) || 0,
      isHidden: !!item.isHidden,
      userId: item.user_id ? String(item.user_id) : undefined,
      uri: item.image_url as string | undefined,
      price: item.price ? String(item.price) : '',
      description_translations: item.description_translations as Photo['description_translations'] || null
    };
}

export const loadAllPhotosFromCloud = async (
  since?: string, 
  page: number = 0, 
  limit: number = 1000,
  categoryId?: string | null,
  tagId?: string | null,
  searchQuery?: string | null
): Promise<Photo[]> => {
  const cacheKey = JSON.stringify({ since, page, limit, categoryId, tagId, searchQuery });
  const cached = photoCache.get(cacheKey);
  if (cached) return cached;

  const selectQuery = tagId 
    ? `
      *,
      photo_tags!inner(*)
    `
    : `
      *,
      photo_tags(*)
    `;

  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select(selectQuery);
  
  if (since) {
    query = query.gt('updated_at', since);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (tagId) {
    query = query.eq('photo_tags.tag_id', tagId);
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    const q = normSearchQuery;
    query = query.or(`name.ilike.%${q}%,manual_code.ilike.%${q}%,model_number.ilike.%${q}%`);
  }

  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (error) {
    console.error("[ERROR] Supabase Fetch Error (loadAllPhotosFromCloud):", error);
    return [];
  }

  const result = (data || []).map(item => mapSupabasePhoto(item));
  photoCache.set(cacheKey, result);
  return result;
};

export const loadPhotosByGroupId = async (groupId: string): Promise<Photo[]> => {
  if (!groupId) return [];
  
  const cacheKey = `group_photos_${groupId}`;
  const cached = photoCache.get(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] Group ${groupId}: ${cached.length} photos`);
    return cached;
  }

  console.log(`[DB Fetch] Loading group photos for: ${groupId}`);
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('*, photo_tags(*)')
    .eq('group_id', groupId);

  if (error) {
    console.error("[ERROR] loadPhotosByGroupId:", error);
    return [];
  }

  console.log(`[DB Success] Group ${groupId}: Received ${data?.length || 0} raw rows`);
  const result = (data || []).map(item => mapSupabasePhoto(item));
  
  // Log details about each photo to see if any fields are suspicious
  if (result.length > 0) {
    console.log(`[Group Analysis] ${groupId}:`, result.map(p => ({ id: p.id, code: p.item_code, hidden: p.isHidden })));
  }

  photoCache.set(cacheKey, result);
  return result;
};

export const getPhotoCount = async (
  categoryId?: string | null,
  tagId?: string | null,
  searchQuery?: string | null
): Promise<number> => {
  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id', { count: 'exact', head: true });
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (tagId) {
    query = query.filter('photo_tags.tag_id', 'eq', tagId);
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    const q = normSearchQuery;
    query = query.or(`name.ilike.%${q}%,manual_code.ilike.%${q}%,model_number.ilike.%${q}%`);
  }

  const { count, error } = await query;
  
  if (error) {
    console.error("[ERROR] Supabase Count Error:", error);
    return 0;
  }

  return count || 0;
};

export const loadPhotosFromCloud = async (
  userId: string, 
  since?: string, 
  page: number = 0, 
  limit: number = 1000,
  categoryId?: string | null
): Promise<Photo[]> => {
  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select(`
      *,
      photo_tags(*),
      category:categories(*)
    `);

  if (since) {
    query = query.gt('updated_at', since);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[ERROR] Supabase Fetch Error (cloud photos):", error);
    return [];
  }

  return (data || []).map(item => mapSupabasePhoto(item));
};
