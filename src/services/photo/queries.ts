import { supabase } from '../../lib/supabase';
import { DB_CONFIG } from '../../constants/config';
import { Photo } from '../../types';
import { normalizeSearchQuery } from '@/lib/utils/stringHelper';
import { VISIBILITY_OR_QUERY } from '../../constants/photoConstants';
import { PAGINATION } from '../../config/constants';
import { PHOTO_LIST_FIELDS } from '../../constants/photoFields';
import { SupabasePhotoRaw } from '@/types/supabase';

export function normalizeStoredUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    
    let processedUrl = url;
    if (processedUrl.includes('/products/')) {
        processedUrl = processedUrl
            .replace('/products/', '/')
            .replace(/\/(\d+-[a-z0-9]+\.webp)$/i, '/temp-$1');
    }
    
    // Match prefix like photox/public/ or photox/thumb/ or photox/original/
    const match = processedUrl.match(/photox\/(public|thumb|original)\/(.+)/);
    if (match) {
        const pathAndFilename = match[0];
        return `https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev/${pathAndFilename}`;
    }
    
    return processedUrl;
}

export function mapSupabasePhoto(item: SupabasePhotoRaw): Photo {
    if (!item) return {} as Photo;
    
    // Extract storageId from image_url if possible
    let storageId = item.id;
    if (item.image_url) {
      try {
        const parts = item.image_url.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          storageId = lastPart.split('.')[0];
        }
      } catch (e) {
        // Suppress warning
      }
    }

    let tag_ids: string[] = [];
    if (Array.isArray(item.photo_tags)) {
      tag_ids = item.photo_tags
        .map((pt) => {
          if (pt == null) return null;
          if (typeof pt === 'object') {
            const typedPt = pt as any;
            if (typedPt.tag_id != null) return String(typedPt.tag_id);
            if (typedPt.tags && typedPt.tags.id != null) return String(typedPt.tags.id);
            if (typedPt.id != null) return String(typedPt.id);
          }
          return String(pt);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    } else if (Array.isArray(item.tags)) {
      // Fallback in case tags are returned directly
      tag_ids = (item.tags as { id: string | number }[])
        .map((t) => {
          if (t == null) return null;
          if (typeof t === 'object' && t.id != null) return String(t.id);
          return String(t);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    }

    const group_id_val = item.group_id ? String(item.group_id) : undefined;
    const group = item.group;
    const created_at = item.created_at;
    const updated_at = item.updated_at;
    const is_group_cover = !!item.is_group_cover;
    const is_pinned = !!item.is_pinned;
    const is_analyzing = !!item.is_analyzing;
    const group_order = item.group_order;
    const user_id = item.user_id ? String(item.user_id) : undefined;
    const category_id = item.category_id ? String(item.category_id) : null;
    const manufacturer_id = item.manufacturer_id ? String(item.manufacturer_id) : null;
    
    return {
      id: String(item.id),
      storage_id: storageId,
      item_code: item.item_code || '',
      manual_code: item.manual_code || '',
      model_number: item.model_number || '',
      image_hash: item.image_hash || '',
      name: item.name || 'Unnamed Product',
      category_id: category_id,
      manufacturer_id: manufacturer_id,
      description: item.description || '',
      image_url: normalizeStoredUrl(item.image_url || ''),
      thumb_url: normalizeStoredUrl(item.thumb_url || item.image_url || ''),
      thumbnail_sm_url: normalizeStoredUrl(item.thumbnail_sm_url || item.thumb_url || item.image_url || ''),
      thumbnail_md_url: normalizeStoredUrl(item.thumbnail_md_url || item.thumb_url || item.image_url || ''),
      thumb_hash: item.thumb_hash || '',
      exif_data: item.exif_data ?? null,
      created_at: created_at || new Date().toISOString(),
      updated_at: updated_at || created_at || new Date().toISOString(),
      group_id: group_id_val,
      group: group ? {
          id: group.id,
          name: group.name,
          color: group.color,
          cover_photo_id: group.cover_photo_id,
          member_count: group.member_count ?? 1,
      } : null,
      is_group_cover: is_group_cover,
      is_hidden: !!item.is_hidden,
      is_pinned: is_pinned,
      is_analyzing: is_analyzing,
      group_order: group_order,
      user_id: user_id,
      uri: normalizeStoredUrl(item.image_url || ''),
      price: item.price ? String(item.price) : '',
      description_translations: item.description_translations as (Photo['description_translations'] | undefined),
      tag_ids: Array.isArray(tag_ids) ? tag_ids : [],
      dimensions: Array.isArray(item.dimensions) ? (item.dimensions as Photo['dimensions']) : [],
      created_at_timestamp: item.created_at_timestamp,
      categoryName: '',
      tagNames: [],
      manufacturerName: ''
    };
}

async function hydrateGroupInfo(photos: Photo[]): Promise<Photo[]> {
  const groupIds = Array.from(new Set(photos.map(p => p.group_id).filter(Boolean))) as string[];
  if (groupIds.length === 0) return photos;

  try {
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, colors, cover_photo_id, member_count')
      .in('id', groupIds);

    if (groupsError) {
      console.warn('[hydrateGroupInfo] Failed to fetch groups:', groupsError);
      return photos;
    }

    const groupMap = new Map<string, any>();
    groupsData?.forEach(g => {
      const dbColors = g.colors;
      let colorValue: string | null = null;
      if (Array.isArray(dbColors) && dbColors.length > 0) {
        colorValue = dbColors[0];
      } else if (typeof dbColors === 'string') {
        colorValue = dbColors;
      }
      
      groupMap.set(String(g.id), {
        id: String(g.id),
        name: g.name || '',
        color: colorValue || '#3b82f6',
        cover_photo_id: g.cover_photo_id || null,
        member_count: g.member_count ?? 1
      });
    });

    return photos.map(p => {
      if (p.group_id && groupMap.has(p.group_id)) {
        return {
          ...p,
          group: groupMap.get(p.group_id)
        };
      }
      return p;
    });
  } catch (e) {
    console.error('[hydrateGroupInfo] Error during client-side hydration:', e);
    return photos;
  }
}

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
    onlyUngrouped: boolean = false
): Promise<Photo[]> => {
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
  }

  if (since) {
    query = query.gt('updated_at', since);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (tagId) {
    const { data: ptData, error: ptError } = await supabase.from('photo_tags').select('photo_id').eq('tag_id', tagId);
    if (ptError) {
      throw {
        message: `Failed to fetch photo_tags in loadAllPhotosFromCloud: ${ptError.message}`,
        path: ['photos', 'loadAllPhotosFromCloud', 'tags'],
        aiDebugHint: `Verify tag_id and photo_tags table. Code: ${ptError.code}`
      };
    }
    const photoIdsWithTag = (ptData || []).map(pt => String(pt.photo_id));
    if (photoIdsWithTag.length > 0) {
      query = query.in('id', photoIdsWithTag);
    } else {
      return [];
    }
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    const q = normSearchQuery.replace(/[\\%_]/g, '\\$&');
    
    const [tagsRes, catsRes] = await Promise.all([
      supabase.from('tags').select('id').ilike('name', `%${q}%`),
      supabase.from('categories').select('id').or(`name.ilike.%${q}%,zh.ilike.%${q}%,en.ilike.%${q}%,ms.ilike.%${q}%`)
    ]);

    if (tagsRes.error || catsRes.error) {
       throw {
         message: `Search resolution failed in loadAllPhotosFromCloud: ${tagsRes.error?.message || catsRes.error?.message}`,
         path: ['photos', 'loadAllPhotosFromCloud', 'search'],
         aiDebugHint: `Check performance or ILIKE complexity on tags/categories.`
       };
    }

    const tagIds = (tagsRes.data || []).map(t => t.id);
    const catIds = (catsRes.data || []).map(c => c.id);

    let photoIdsFromTags: string[] = [];
    if (tagIds.length > 0) {
      const { data: ptData, error: ptError } = await supabase.from('photo_tags').select('photo_id').in('tag_id', tagIds);
      if (ptError) {
        throw {
          message: `Failed to resolve photo tags during search in loadAllPhotosFromCloud: ${ptError.message}`,
          path: ['photos', 'loadAllPhotosFromCloud', 'search-tags'],
          aiDebugHint: `Possible heavy IN query on photo_tags.`
        };
      }
      if (ptData) photoIdsFromTags = ptData.map(pt => pt.photo_id);
    }

    let orSegments = [
      `name.ilike.%${q}%`,
      `manual_code.ilike.%${q}%`,
      `model_number.ilike.%${q}%`,
      `description.ilike.%${q}%`,
      `item_code.ilike.%${q}%`
    ];

    if (catIds.length > 0) {
      orSegments.push(`category_id.in.(${catIds.join(',')})`);
    }

    if (photoIdsFromTags.length > 0) {
      orSegments.push(`id.in.(${photoIdsFromTags.join(',')})`);
    }

    query = query.or(orSegments.join(','));
  }

  const from = page * limit;
  const to = from + limit - 1;

  // 1. 置顶优先
  query = query.order('is_pinned', { ascending: false, nullsFirst: false });
  if (isAdminMode) {
    query = query.order('is_hidden', { ascending: true, nullsFirst: true });
  }
  
  // 2. 动态用户选择排序 (如最新上传、最旧、按名称)
  if (sortOrder === 'oldest' || sortOrder === 'asc') {
    query = query.order('created_at', { ascending: true })
                 .order('id', { ascending: true });
  } else if (sortOrder === 'name') {
    query = query.order('name', { ascending: true, nullsFirst: true })
                 .order('created_at', { ascending: false });
  } else {
    // 默认：最新上传优先
    query = query.order('created_at', { ascending: false })
                 .order('id', { ascending: false });
  }

  // 3. 兜底及拖拽/合组顺序
  query = query.order('sort_order', { ascending: true, nullsFirst: false })
               .order('group_order', { ascending: true, nullsFirst: false });

  const { data, error } = await query.range(from, to);

  if (error) {
    throw {
      message: `Failed to load photos: ${error.message}`,
      path: ['photos', 'loadAllPhotosFromCloud'],
      aiDebugHint: `Check PHOTO_SELECT_FIELDS for missing columns or RLS policies. Code: ${error.code}`
    };
  }

  const fetched = (data || []).map(item => mapSupabasePhoto(item));

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
        .select('*')
        .in('group_id', missingGroupCovers)
        .eq('is_group_cover', true);

      if (!coverError && coverData && coverData.length > 0) {
        const covers = coverData.map(item => mapSupabasePhoto(item));
        fetched.push(...covers);
      }
    } catch (e) {
      console.warn('[loadAllPhotosFromCloud] Failed to fetch missing group covers', e);
    }
  }

  return await hydrateGroupInfo(fetched);
};

export const loadPhotosByGroupId = async (groupId: string, isAdminMode: boolean = false): Promise<Photo[]> => {
    if (!groupId) return [];

    try {
        const { data, error } = await supabase.rpc('get_group_with_photos', { group_uuid: groupId });
        if (error) throw error;
        if (data) {
            const rows = Array.isArray(data) ? data : (data.photos || []);
            let photos = rows.map((item: SupabasePhotoRaw) => mapSupabasePhoto(item));
            if (!isAdminMode) {
               photos = photos.filter(p => !p.is_hidden);
            }
            return photos;
        }
    } catch (e) {
        // Fallback or handle error
    }

    let query = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('*')
        .eq('group_id', groupId);

    if (!isAdminMode) {
        query = query.or(VISIBILITY_OR_QUERY);
    }
    
    query = query.order('is_hidden', { ascending: true, nullsFirst: true })
                 .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
        throw {
            message: `Failed to load photos by group ID: ${error.message}`,
            path: ['photos', 'loadPhotosByGroupId'],
            aiDebugHint: `Verify group_id column exists. Code: ${error.code}`
        };
    }

    return (data || []).map(item => mapSupabasePhoto(item));
};

export const loadPhotosByGroupIdPaginated = async (
  groupId: string,
  page: number = 1,
  pageSize: number = PAGINATION.GROUP_PAGE_SIZE,
  isAdminMode: boolean = false
): Promise<{ photos: Photo[]; total: number }> => {
  if (!groupId) return { photos: [], total: 0 };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error } = await supabase.rpc('get_group_with_photos', { group_uuid: groupId });
    if (error) throw error;
    if (data) {
       const rows = Array.isArray(data) ? data : (data.photos || []);
       let photos = rows.map((item: SupabasePhotoRaw) => mapSupabasePhoto(item));
       if (!isAdminMode) {
          photos = photos.filter(p => !p.is_hidden);
       }
       const paginatedPhotos = photos.slice(from, to + 1);
       return { photos: paginatedPhotos, total: photos.length || data.total_count || 0 };
    }
  } catch (e) {
      // Fallback
  }

  let countQuery = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId);

  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('*')
    .eq('group_id', groupId);

  if (!isAdminMode) {
    countQuery = countQuery.or(VISIBILITY_OR_QUERY);
    query = query.or(VISIBILITY_OR_QUERY);
  }

  const [countRes, queryRes] = await Promise.all([
    countQuery,
    query.order('is_group_cover', { ascending: false })
         .order('is_hidden', { ascending: true, nullsFirst: true })
         .order('created_at', { ascending: false })
         .range(from, to)
  ]);

  if (queryRes.error) {
    throw {
      message: `Failed to load paginated photos by group ID: ${queryRes.error.message}`,
      path: ['photos', 'loadPhotosByGroupIdPaginated'],
      aiDebugHint: `Check RPC definition. Code: ${queryRes.error.code}`
    };
  }

  const mapped = (queryRes.data || []).map(item => mapSupabasePhoto(item));
  return { photos: mapped, total: countRes.count || 0 };
};

export const getPhotoCount = async (
  categoryId?: string | null,
  tagId?: string | null,
  searchQuery?: string | null,
  isAdminMode: boolean = false
): Promise<number> => {
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
    if (ptError) {
      throw {
        message: `Failed to fetch photo_tags for count: ${ptError.message}`,
        path: ['photoService', 'getPhotoCount', 'tags'],
        aiDebugHint: `Check photo_tags table. Code: ${ptError.code}`
      };
    }
    const photoIdsWithTag = (ptData || []).map(pt => String(pt.photo_id));
    if (photoIdsWithTag.length > 0) {
      query = query.in('id', photoIdsWithTag);
    } else {
      return 0;
    }
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    const q = normSearchQuery.replace(/[\\%_]/g, '\\$&');
    
    const [tagsRes, catsRes] = await Promise.all([
      supabase.from('tags').select('id').ilike('name', `%${q}%`),
      supabase.from('categories').select('id').or(`name.ilike.%${q}%,zh.ilike.%${q}%,en.ilike.%${q}%,ms.ilike.%${q}%`)
    ]);

    if (tagsRes.error || catsRes.error) {
       throw {
         message: `Search resolution failed in getPhotoCount: ${tagsRes.error?.message || catsRes.error?.message}`,
         path: ['photos', 'getPhotoCount', 'search'],
       };
    }

    const tagIds = (tagsRes.data || []).map(t => t.id);
    const catIds = (catsRes.data || []).map(c => c.id);

    let photoIdsFromTags: string[] = [];
    if (tagIds.length > 0) {
      const { data: ptData, error: ptError } = await supabase.from('photo_tags').select('photo_id').in('tag_id', tagIds);
      if (ptError) {
        throw {
          message: `Failed to resolve tag ids for count: ${ptError.message}`,
          path: ['photos', 'getPhotoCount', 'search-tags'],
        };
      }
      if (ptData) photoIdsFromTags = ptData.map(pt => pt.photo_id);
    }

    let orSegments = [
      `name.ilike.%${q}%`,
      `manual_code.ilike.%${q}%`,
      `model_number.ilike.%${q}%`,
      `description.ilike.%${q}%`,
      `item_code.ilike.%${q}%`
    ];

    if (catIds.length > 0) {
      orSegments.push(`category_id.in.(${catIds.join(',')})`);
    }

    if (photoIdsFromTags.length > 0) {
      orSegments.push(`id.in.(${photoIdsFromTags.join(',')})`);
    }

    query = query.or(orSegments.join(','));
  }

  const { count, error } = await query;
  
  if (error) {
    throw {
      message: `Failed to get photo count: ${error.message}`,
      path: ['photos', 'getPhotoCount'],
    };
  }

  return count || 0;
};

export const getLocalPhotoCount = async (): Promise<number> => {
  try {
    const { syncCache } = await import('@/lib/db/indexedDB');
    const photos = await syncCache.getPhotos();
    return Array.isArray(photos) ? photos.length : 0;
  } catch (e) {
    return 0;
  }
};

export const getPhotosWithoutThumbHash = async (): Promise<{ id: string }[]> => {
  const { data, error } = await supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id')
    .is('thumb_hash', null);

  if (error) {
    throw {
      message: `Failed to find photos without thumbhash: ${error.message}`,
      path: ['photos', 'getPhotosWithoutThumbHash'],
    };
  }
  return data || [];
};

export const checkImageHashExists = async (hash: string): Promise<{image_url: string, manual_code: string} | null> => {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('image_url, manual_code')
      .eq('image_hash', hash)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw {
        message: `Hash check query failed: ${error.message}`,
        path: ['photos', 'checkImageHashExists'],
      };
    }
    return data ? { image_url: data.image_url, manual_code: data.manual_code } : null;
};
