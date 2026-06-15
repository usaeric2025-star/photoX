import { api } from '@/lib/api';
import { Photo } from '@/types';
import { loadTagsFromCloud } from '../../tag';
import { mapSupabasePhoto } from '../mappers';
import { normalizeSearchQuery } from '@/lib/utils';
import { logger } from '@/lib/logger';

/**
 * Loads all photos from cloud with filters
 */
export const getPhotos = async (
    since?: string,
    page: number = 0,
    limit: number = 1000,
    categoryId?: string | null,
    tagId?: string | null,
    searchQuery?: string | null,
    isAdminMode: boolean = false,
    signal?: AbortSignal,
    sortOrder?: 'asc' | 'desc' | 'newest' | 'oldest' | 'name' | string | null,
    onlyUngrouped: boolean = false,
    manufacturerId?: string | null,
    isHidden?: boolean | null
): Promise<Photo[]> => {
    const res = await api.photos.list.$post({
      json: { page, limit, categoryId, tagId, searchQuery, isAdminMode, onlyUngrouped, manufacturerId, isHidden, sortOrder }
    });
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load photos from cloud: ${errText}`);
    }
    const { data } = await res.json();
    
    const fetched = (data || []).map((item: any) => mapSupabasePhoto(item));
    
    return fetched;
};

/**
 * Gets total photo count with filters
 */
export const getPhotoCount = async (
  categoryId?: string | null,
  tagId?: string | null,
  searchQuery?: string | null,
  isAdminMode: boolean = false
): Promise<number> => {
    const res = await api.photos.count.$post({
      json: { categoryId, tagId, searchQuery, isAdminMode }
    });
    if (!res.ok) throw new Error('Failed to get photo count');
    const { data } = await res.json();
    return data || 0;
};

export const getLocalPhotoCount = async (): Promise<number> => {
    const { syncCache } = await import('@/lib/db/indexedDB');
    const photos = await syncCache.getPhotos();
    return Array.isArray(photos) ? photos.length : 0;
};

export const loadPhotosByIds = async (ids: string[]): Promise<Photo[]> => {
    if (!ids || ids.length === 0) return [];
    const res = await api.photos['by-ids'].$post({
      json: { ids }
    });
    if (!res.ok) throw new Error('Failed to load photos by ids');
    const { data } = await res.json();
    return (data || []).map((item: any) => mapSupabasePhoto(item));
};

export const getPhotosWithoutThumbHash = async (): Promise<{ id: string }[]> => {
    const res = await api.photos['without-thumb-hash'].$post();
    if (!res.ok) throw new Error('Failed to get photos without thumb hash');
    const { data } = await res.json();
    return data || [];
};

export const checkImageHashExists = async (hash: string): Promise<{image_url: string, manual_code: string} | null> => {
    const res = await api.photos['check-hash'].$post({
      json: { hash }
    });
    if (!res.ok) throw new Error('Failed to check image hash');
    const { data } = await res.json();
    return data ? { image_url: data.image_url, manual_code: data.manual_code } : null;
};

export async function findPhotoIdsBySearch(q: string): Promise<{ catIds: number[], photoIdsFromTags: string[], q: string } | null> {
  const normSearchQuery = normalizeSearchQuery(q);
  if (!normSearchQuery) return null;

  try {
    const res = await api.search.ids.$get({ query: { q: normSearchQuery } });
    if (!res.ok) throw new Error('Search failed');

    const { data } = await res.json();
    return {
      catIds: data.catIds,
      photoIdsFromTags: data.photoIds,
      q: normSearchQuery
    };
  } catch (e) {
    logger.error('Search service error:', e);
    return null;
  }
}
