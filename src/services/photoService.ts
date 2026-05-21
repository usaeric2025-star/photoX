import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { Photo } from '../types';
import { normalizeSearchQuery } from '../utils/stringHelper';
import { VISIBILITY_OR_QUERY } from '../constants/photoConstants';
import { globalHandleError } from '../utils/errorHandler';
import { PAGINATION } from '../config/constants';

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

    let tag_ids: string[] = [];
    if (Array.isArray(item.photo_tags)) {
      tag_ids = item.photo_tags
        .map((pt: { tag_id?: string | number; tags?: { id: string | number }; id?: string | number }) => {
          if (pt == null) return null;
          if (typeof pt === 'object') {
            const typedPt = pt;
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
        .map((t: { id?: string | number } | string | number) => {
          if (t == null) return null;
          if (typeof t === 'object' && t.id != null) return String(t.id);
          return String(t);
        })
        .filter((id: string | null) => id != null && id !== 'undefined' && id !== 'null' && id !== '') as string[];
    }

    const group_id = item.group_id ? String(item.group_id) : undefined;
    const created_at = item.created_at as string | undefined;
    const updated_at = item.updated_at as string | undefined;
    const is_group_cover = !!item.is_group_cover;
    const is_pinned = !!item.is_pinned || !!(item as any).is_pinned;
    const is_analyzing = !!item.is_analyzing;
    const group_order = item.group_order as number | undefined;
    const user_id = item.user_id ? String(item.user_id) : undefined;
    const category_id = item.category_id ? String(item.category_id) : null;
    const manufacturer_id = item.manufacturer_id ? String(item.manufacturer_id) : null;
    
    return {
      id: String(item.id),
      storage_id: storageId,
      item_code: item.item_code as string | undefined,
      manual_code: item.manual_code as string | undefined,
      model_number: item.model_number as string | undefined,
      image_hash: item.image_hash as string | undefined,
      name: (item.name as string) || 'Unnamed Product',
      category_id: category_id,
      manufacturer_id: manufacturer_id,
      description: item.description as string | undefined,
      image_url: item.image_url as string | undefined,
      thumb_url: (item.thumb_url as string) || (item.image_url as string),
      exif_data: (item.exif_data as Record<string, unknown>) ?? null,
      created_at: created_at,
      updated_at: updated_at,
      group_id: group_id,
      is_group_cover: is_group_cover,
      is_hidden: !!item.is_hidden,
      is_pinned: is_pinned,
      is_analyzing: is_analyzing,
      user_id: user_id,
      uri: item.image_url as string | undefined,
      price: item.price ? String(item.price) : '',
      description_translations: item.description_translations as Photo['description_translations'] || null,
      tag_ids: Array.isArray(tag_ids) ? tag_ids : [],
      dimensions: Array.isArray(item.dimensions) ? (item.dimensions as Photo['dimensions']) : [],
      created_at_timestamp: item.created_at_timestamp as number | undefined
    };
}

export const loadAllPhotosFromCloud = async (
    since?: string,
    page: number = 0,
    limit: number = 1000,
    categoryId?: string | null,
    tagId?: string | null,
    searchQuery?: string | null,
    isAdminMode: boolean = false,
    signal?: AbortSignal
): Promise<Photo[]> => {
    const selectQuery = searchQuery
        ? `*, photo_tags(*)`
        : `*, photo_tags(*)`;

    let query = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select(selectQuery);

  if (signal) {
    query = query.abortSignal(signal);
  }

  if (!isAdminMode) {
    query = query.or(VISIBILITY_OR_QUERY);
  }

  if (since) {
    query = query.gt('updated_at', since);
  }

  let filterSegments: string[] = [];
  if (categoryId) {
    filterSegments.push(`category_id.eq.${categoryId}`);
  }

  if (tagId) {
    const { data: ptData } = await supabase.from('photo_tags').select('photo_id').eq('tag_id', tagId);
    const photoIdsWithTag = (ptData || []).map(pt => String(pt.photo_id));
    if (photoIdsWithTag.length > 0) {
      filterSegments.push(`id.in.(${photoIdsWithTag.join(',')})`);
    } else if (!categoryId) {
      // If no matching tag and no category, result is empty
      return [];
    }
  }

  if (filterSegments.length > 0) {
    query = query.or(filterSegments.join(','));
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    // Escape special characters for ILIKE: %, _, \
    const q = normSearchQuery.replace(/[\\%_]/g, '\\$&');
    
    // Resolve matching tags & categories to improve Supabase OR filtering
    const [tagsRes, catsRes] = await Promise.all([
      supabase.from('tags').select('id').ilike('name', `%${q}%`),
      supabase.from('categories').select('id').or(`name.ilike.%${q}%,zh.ilike.%${q}%,en.ilike.%${q}%,ms.ilike.%${q}%`)
    ]);

    const tagIds = (tagsRes.data || []).map(t => t.id);
    const catIds = (catsRes.data || []).map(c => c.id);

    let photoIdsFromTags: string[] = [];
    if (tagIds.length > 0) {
      const { data: ptData } = await supabase.from('photo_tags').select('photo_id').in('tag_id', tagIds);
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

  query = query.order('is_pinned', { ascending: false, nullsFirst: false });
  if (isAdminMode) {
    query = query.order('is_hidden', { ascending: true, nullsFirst: true });
  }
    const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

    if (error) {
        globalHandleError(error, "Supabase Fetch (loadAllPhotosFromCloud)", true);
        return [];
    }

    return (data || []).map(item => mapSupabasePhoto(item));
};

export const loadPhotosByGroupId = async (groupId: string, isAdminMode: boolean = false): Promise<Photo[]> => {
    if (!groupId) return [];

    try {
        const { data, error } = await supabase.rpc('get_group_with_photos', { group_uuid: groupId });
        if (error) {
            console.warn('get_group_with_photos RPC failed, falling back to query', error);
            throw error;
        }
        if (data) {
            const rows = Array.isArray(data) ? data : (data.photos || []);
            // For public mode, we could manually filter here just in case the RPC doesn't do it
            let photos = rows.map((item: any) => mapSupabasePhoto(item));
            if (!isAdminMode) {
               photos = photos.filter(p => !p.is_hidden);
            }
            return photos;
        }
    } catch (e) {
        // Fallback: normal query
    }

    let query = supabase
        .from(DB_CONFIG.TABLE_NAME)
        .select('*, photo_tags(*)')
        .eq('group_id', groupId);

    if (!isAdminMode) {
        query = query.or(VISIBILITY_OR_QUERY);
    }

    const { data, error } = await query;

    if (error) {
        globalHandleError(error, "loadPhotosByGroupId", true);
        return [];
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
       let photos = rows.map((item: any) => mapSupabasePhoto(item));
       if (!isAdminMode) {
          photos = photos.filter(p => !p.is_hidden);
       }
       // handle pagination locally if RPC returns all items
       const paginatedPhotos = photos.slice(from, to + 1);
       return { photos: paginatedPhotos, total: photos.length || data.total_count || 0 };
    }
  } catch (e) {
     console.warn("RPC get_group_with_photos failed for paginated:", e);
     // Fallback
  }

  let countQuery = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId);

  let query = supabase
    .from(DB_CONFIG.TABLE_NAME)
    .select('*, photo_tags(*)')
    .eq('group_id', groupId);

  if (!isAdminMode) {
    countQuery = countQuery.or(VISIBILITY_OR_QUERY);
    query = query.or(VISIBILITY_OR_QUERY);
  }

  const [countRes, queryRes] = await Promise.all([
    countQuery,
    query.order('is_group_cover', { ascending: false })
         .order('created_at', { ascending: false })
         .range(from, to)
  ]);

  if (queryRes.error) {
    globalHandleError(queryRes.error, "loadPhotosByGroupIdPaginated", true);
    return { photos: [], total: 0 };
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
    .select(tagId ? 'id, photo_tags!inner(tag_id)' : 'id', { count: 'exact', head: true });
  
  if (!isAdminMode) {
    query = query.or(VISIBILITY_OR_QUERY);
  }

  let filterSegments: string[] = [];
  if (categoryId) {
    filterSegments.push(`category_id.eq.${categoryId}`);
  }

  if (tagId) {
    const { data: ptData } = await supabase.from('photo_tags').select('photo_id').eq('tag_id', tagId);
    const photoIdsWithTag = (ptData || []).map(pt => String(pt.photo_id));
    if (photoIdsWithTag.length > 0) {
      filterSegments.push(`id.in.(${photoIdsWithTag.join(',')})`);
    } else if (!categoryId) {
      return 0;
    }
  }
  
  if (filterSegments.length > 0) {
    query = query.or(filterSegments.join(','));
  }

  const normSearchQuery = normalizeSearchQuery(searchQuery || '');
  if (normSearchQuery) {
    // Escape special characters for ILIKE: %, _, \
    const q = normSearchQuery.replace(/[\\%_]/g, '\\$&');
    
    // Resolve matching tags & categories to improve Supabase OR filtering
    const [tagsRes, catsRes] = await Promise.all([
      supabase.from('tags').select('id').ilike('name', `%${q}%`),
      supabase.from('categories').select('id').or(`name.ilike.%${q}%,zh.ilike.%${q}%,en.ilike.%${q}%,ms.ilike.%${q}%`)
    ]);

    const tagIds = (tagsRes.data || []).map(t => t.id);
    const catIds = (catsRes.data || []).map(c => c.id);

    let photoIdsFromTags: string[] = [];
    if (tagIds.length > 0) {
      const { data: ptData } = await supabase.from('photo_tags').select('photo_id').in('tag_id', tagIds);
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
    globalHandleError(error, "getPhotoCount", true);
    return 0;
  }

  return count || 0;
};
