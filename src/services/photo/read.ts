import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { Photo } from '../../types';
import { withErrorHandling } from '@/lib/error/wrapper';
import { withSupabase } from '@/lib/error/supabaseWrapper';
import { success, errorFactory } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';
import { PAGINATION } from '../../config/constants';
import { PHOTO_LIST_FIELDS } from '../../constants/photoFields';
import { mapSupabasePhoto } from './fromDb';
import { hydrateGroupInfo } from './with';
import { normalizeSearchQuery } from '@/lib/utils';
import { VISIBILITY_OR_QUERY } from '../../constants/photoConstants';
import { loadTagsFromCloud } from '../tag';

export const loadAllPhotosFromCloud = async (
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
    
    // RPC call
    const res = await api.photos.list.$post({
      json: { page, limit, categoryId, isAdminMode, onlyUngrouped, manufacturerId, isHidden }
    });
    
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to load photos from cloud'), 'read');
    const { data } = await res.json();
    
    const allTags = await loadTagsFromCloud();
    const fetched = (data || []).map((item: any) => mapSupabasePhoto(item, allTags));
    
    // Keeping hydration logic client-side for now as it's complex
    // ...
    const hydrated = await hydrateGroupInfo(fetched);
    return success(hydrated);
  }, 'loadAllPhotosFromCloud');
};

export const loadPhotosByGroupId = async (groupId: string, isAdminMode: boolean = false): Promise<AppResult<Photo[]>> => {
  if (!groupId) return success([]);

  return withErrorHandling(async () => {
    const res = await api.photos['list-by-group'].$post({
      json: { groupId, isAdminMode }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to load photos by group'), 'read');
    const { data } = await res.json();
    const allTags = await loadTagsFromCloud();
    return success((data || []).map((item: any) => mapSupabasePhoto(item, allTags)));
  }, 'loadPhotosByGroupId');
};

export const loadPhotosByGroupIdPaginated = async (
  groupId: string,
  page: number = 1,
  pageSize: number = PAGINATION.GROUP_PAGE_SIZE,
  isAdminMode: boolean = false
): Promise<AppResult<{ photos: Photo[]; total: number }>> => {
  return withErrorHandling(async () => {
    if (!groupId) return { photos: [], total: 0 };
    const res = await api.photos['list-by-group-paginated'].$post({
      json: { groupId, page, pageSize, isAdminMode }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to load paginated group photos'), 'read');
    const { data } = await res.json();
    const allTags = await loadTagsFromCloud();
    return { 
      photos: (data.photos || []).map((item: any) => mapSupabasePhoto(item, allTags)), 
      total: data.total || 0 
    };
  }, 'loadPhotosByGroupIdPaginated');
};

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
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to get photo count'), 'read');
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
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to load photos by ids'), 'read');
    const { data } = await res.json();
    const allTags = await loadTagsFromCloud();
    return (data || []).map((item: any) => mapSupabasePhoto(item, allTags));
  }, 'loadPhotosByIds');
};

export const getPhotosWithoutThumbHash = async (): Promise<AppResult<{ id: string }[]>> => {
  return withErrorHandling(async () => {
    const res = await api.photos['without-thumb-hash'].$post();
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to get photos without thumb hash'), 'read');
    const { data } = await res.json();
    return data || [];
  }, 'getPhotosWithoutThumbHash');
};

export const checkImageHashExists = async (hash: string): Promise<AppResult<{image_url: string, manual_code: string} | null>> => {
  return withErrorHandling(async () => {
    const res = await api.photos['check-hash'].$post({
      json: { hash }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to check image hash'), 'read');
    const { data } = await res.json();
    return data ? { image_url: data.image_url, manual_code: data.manual_code } : null;
  }, 'checkImageHashExists', 'low');
};
