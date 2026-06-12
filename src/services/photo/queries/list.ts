import { api } from '@/lib/api';
import { ErrorFactory, success } from '@/lib/error/ErrorFactory';
import { withErrorHandling } from '@/lib/error/wrapper';
import { Photo } from '@/types';
import { AppResult } from '@/types/api';
import { loadTagsFromCloud } from '../../tag';
import { mapSupabasePhoto } from '../mappers';
import { hydrateGroupInfo } from '../with';
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
): Promise<AppResult<Photo[]>> => {
  return withErrorHandling(async () => {
    const res = await api.photos.list.$post({
      json: { page, limit, categoryId, isAdminMode, onlyUngrouped, manufacturerId, isHidden }
    });
    
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to load photos from cloud'), 'queries');
    const { data } = await res.json();
    
    const allTags = await loadTagsFromCloud();
    const fetched = (data || []).map((item: any) => mapSupabasePhoto(item, allTags));
    
    const hydrated = await hydrateGroupInfo(fetched);
    return success(hydrated);
  }, 'loadAllPhotosFromCloud');
};

/**
 * Gets total photo count with filters
 */
export const getPhotoCount = async (
  categoryId?: string | null,
  tagId?: string | null,
  searchQuery?: string | null,
  isAdminMode: boolean = false
): Promise<AppResult<number>> => {
  return withErrorHandling(async () => {
    const res = await api.photos.count.$post({
      json: { categoryId, tagId, searchQuery, isAdminMode }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to get photo count'), 'queries');
    const { data } = await res.json();
    return data || 0;
  }, 'getPhotoCount');
};

export const getLocalPhotoCount = async (): Promise<AppResult<number>> => {
  return withErrorHandling(async () => {
    const { syncCache } = await import('@/lib/db/indexedDB');
    const photos = await syncCache.getPhotos();
    return Array.isArray(photos) ? photos.length : 0;
  }, 'getLocalPhotoCount');
};

export const loadPhotosByIds = async (ids: string[]): Promise<AppResult<Photo[]>> => {
  return withErrorHandling(async () => {
    if (!ids || ids.length === 0) return [];
    const res = await api.photos['by-ids'].$post({
      json: { ids }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to load photos by ids'), 'queries');
    const { data } = await res.json();
    const allTags = await loadTagsFromCloud();
    return (data || []).map((item: any) => mapSupabasePhoto(item, allTags));
  }, 'loadPhotosByIds');
};

export const getPhotosWithoutThumbHash = async (): Promise<AppResult<{ id: string }[]>> => {
  return withErrorHandling(async () => {
    const res = await api.photos['without-thumb-hash'].$post();
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to get photos without thumb hash'), 'queries');
    const { data } = await res.json();
    return data || [];
  }, 'getPhotosWithoutThumbHash');
};

export const checkImageHashExists = async (hash: string): Promise<AppResult<{image_url: string, manual_code: string} | null>> => {
  return withErrorHandling(async () => {
    const res = await api.photos['check-hash'].$post({
      json: { hash }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to check image hash'), 'queries');
    const { data } = await res.json();
    return data ? { image_url: data.image_url, manual_code: data.manual_code } : null;
  }, 'checkImageHashExists', 'low');
};

export async function findPhotoIdsBySearch(q: string): Promise<{ catIds: number[], photoIdsFromTags: string[], q: string } | null> {
  const normSearchQuery = normalizeSearchQuery(q);
  if (!normSearchQuery) return null;

  try {
    const res = await api.search.ids.$get({ query: { q: normSearchQuery } });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Search failed'), 'queries');

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
