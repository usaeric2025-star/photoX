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
    const { withRetry } = await import('@/lib/resilience');
    
    return withRetry(async () => {
      const selectQuery = PHOTO_LIST_FIELDS;
      
      let query = supabase
          .from(DB_CONFIG.TABLE_NAME)
          .select(selectQuery);

    if (signal) {
      query = query.abortSignal(signal);
    }

    if (onlyUngrouped) {
      query = query.is('group_id', null);
    }

    if (!isAdminMode) {
      query = query.or(VISIBILITY_OR_QUERY);
    } else if (isHidden !== undefined && isHidden !== null) {
      query = query.eq('is_hidden', isHidden);
    }

    if (manufacturerId) {
      query = query.eq('manufacturer_id', manufacturerId);
    }

    if (since) {
      query = query.gt('updated_at', since);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (tagId) {
      const { data: ptData, error: ptError } = await supabase.from('photo_tags').select('photo_id').eq('tag_id', tagId);
      if (ptError) throw ptError;
      
      const photoIdsWithTag = (ptData || []).map(pt => String(pt.photo_id));
      if (photoIdsWithTag.length > 0) {
        query = query.in('id', photoIdsWithTag);
      } else {
        return success([]);
      }
    }

    const normSearchQuery = normalizeSearchQuery(searchQuery || '');
    if (normSearchQuery) {
      const { findPhotoIdsBySearch, buildSearchFilter } = await import('./search');
      const { catIds, photoIdsFromTags, q } = await findPhotoIdsBySearch(normSearchQuery) as any;
      const filter = buildSearchFilter(catIds, photoIdsFromTags, q);
      query = query.or(filter);
    }

    const from = page * limit;
    const to = from + limit - 1;

    query = query.order('is_pinned', { ascending: false, nullsFirst: false });
    if (isAdminMode) {
      query = query.order('is_hidden', { ascending: true, nullsFirst: true });
    }
    
    if (sortOrder === 'oldest' || sortOrder === 'asc') {
      query = query.order('created_at', { ascending: true })
                   .order('id', { ascending: true });
    } else if (sortOrder === 'name') {
      query = query.order('name', { ascending: true, nullsFirst: true })
                   .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false })
                   .order('id', { ascending: true });
    }

    query = query.order('group_order', { ascending: true, nullsFirst: false });

    const { data, error } = await query.range(from, to);

    if (error) throw error;

    const allTags = await loadTagsFromCloud();
    const fetched = (data || []).map(item => mapSupabasePhoto(item, allTags));

    const groupIds = Array.from(new Set(fetched.map(p => p.group_id).filter(Boolean))) as string[];
    const missingGroupCovers: string[] = [];
    
    for (const gid of groupIds) {
      const hasCover = fetched.some(p => p.group_id === gid && p.is_group_cover);
      if (!hasCover) {
        missingGroupCovers.push(gid);
      }
    }

    if (missingGroupCovers.length > 0) {
      try {
        const { data: coverData, error: coverError } = await supabase
          .from(DB_CONFIG.TABLE_NAME)
          .select(PHOTO_LIST_FIELDS)
          .in('group_id', missingGroupCovers)
          .eq('is_group_cover', true);

        if (!coverError && coverData && coverData.length > 0) {
          const covers = coverData.map(item => mapSupabasePhoto(item, allTags));
          fetched.push(...covers);
        }
      } catch (e) {
        console.warn('[loadAllPhotosFromCloud] Failed to fetch missing group covers', e);
      }
    }

    const hydrated = await hydrateGroupInfo(fetched);
    return success(hydrated);
    });
  }, 'loadAllPhotosFromCloud');
};

export const loadPhotosByGroupId = async (groupId: string, isAdminMode: boolean = false): Promise<AppResult<Photo[]>> => {
  if (!groupId) return success([]);

  let query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select(PHOTO_LIST_FIELDS)
      .eq('group_id', groupId);

  if (!isAdminMode) {
      query = query.or(VISIBILITY_OR_QUERY);
  }
  
  query = query.order('is_group_cover', { ascending: false })
               .order('is_hidden', { ascending: true, nullsFirst: true })
               .order('created_at', { ascending: false })
               .order('id', { ascending: true });

  return withSupabase(query, 'loadPhotosByGroupId').then(async res => {
    if (!res.ok) return res;
    const allTags = await loadTagsFromCloud();
    return success((res.data || []).map(item => mapSupabasePhoto(item, allTags)));
  });
};

export const loadPhotosByGroupIdPaginated = async (
  groupId: string,
  page: number = 1,
  pageSize: number = PAGINATION.GROUP_PAGE_SIZE,
  isAdminMode: boolean = false
): Promise<AppResult<{ photos: Photo[]; total: number }>> => {
  return withErrorHandling(async () => {
    if (!groupId) return { photos: [], total: 0 };

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let countQuery = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId);

    let query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select(PHOTO_LIST_FIELDS)
      .eq('group_id', groupId);

    if (!isAdminMode) {
      countQuery = countQuery.or(VISIBILITY_OR_QUERY);
      query = query.or(VISIBILITY_OR_QUERY);
    }

    const [countRes, queryRes] = await Promise.all([
      countQuery,
      query.order('is_group_cover', { ascending: false })
           .order('group_order', { ascending: true, nullsFirst: false })
           .order('is_hidden', { ascending: true, nullsFirst: true })
           .order('created_at', { ascending: false })
           .order('id', { ascending: true })
           .range(from, to)
    ]);

    if (queryRes.error) throw queryRes.error;

    const allTags = await loadTagsFromCloud();
    return { 
      photos: (queryRes.data || []).map(item => mapSupabasePhoto(item, allTags)), 
      total: countRes.count || 0 
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
    let query = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('*', { count: 'exact', head: true });
    
    if (!isAdminMode) {
      query = query.or(VISIBILITY_OR_QUERY);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (tagId) {
      const { data: ptData, error: ptError } = await supabase.from('photo_tags').select('photo_id').eq('tag_id', tagId);
      if (ptError) throw ptError;

      const photoIdsWithTag = (ptData || []).map(pt => String(pt.photo_id));
      if (photoIdsWithTag.length > 0) {
        query = query.in('id', photoIdsWithTag);
      } else {
        return 0;
      }
    }

    const normSearchQuery = normalizeSearchQuery(searchQuery || '');
    if (normSearchQuery) {
      const { findPhotoIdsBySearch, buildSearchFilter } = await import('./search');
      const { catIds, photoIdsFromTags, q } = await findPhotoIdsBySearch(normSearchQuery) as any;
      const filter = buildSearchFilter(catIds, photoIdsFromTags, q);
      query = query.or(filter);
    }

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
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

    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select(PHOTO_LIST_FIELDS)
      .in('id', ids);

    if (error) throw error;
    const allTags = await loadTagsFromCloud();
    return (data || []).map(item => mapSupabasePhoto(item, allTags));
  }, 'loadPhotosByIds');
};

export const getPhotosWithoutThumbHash = async (): Promise<AppResult<{ id: string }[]>> => {
  const query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id')
    .is('thumb_hash', null);

  return withSupabase(query, 'getPhotosWithoutThumbHash');
};

export const checkImageHashExists = async (hash: string): Promise<AppResult<{image_url: string, manual_code: string} | null>> => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('image_url, manual_code')
      .eq('image_hash', hash)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data ? { image_url: data.image_url, manual_code: data.manual_code } : null;
  }, 'checkImageHashExists', 'low');
};
