import { getPathFromUrl } from '@/lib/utils';
import { SupabasePhotoRaw } from '@/types/supabase';
import { Photo, Tag } from '@/types';

export const getThumbnailUrl = (imageUrl: string, width: number = 400, height: number = 400, imageHash?: string) => {
  const workerUrl = import.meta.env.VITE_THUMBNAIL_WORKER_URL;
  if (!workerUrl || !imageUrl || !workerUrl.startsWith('http')) return imageUrl;
  
  const path = getPathFromUrl(imageUrl);
  if (!path) return imageUrl;
  
  const base = workerUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  const cacheBuster = imageHash ? `&h=${imageHash.slice(0,8)}` : '';
  
  return `${base}${cleanPath}?w=${width}&h=${height}${cacheBuster}`;
};

export function normalizeStoredUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    
    let processedUrl = url;
    if (processedUrl.includes('/products/')) {
        processedUrl = processedUrl
            .replace('/products/', '/')
            .replace(/\/(\d+-[a-z0-9]+\.webp)$/i, '/temp-$1');
    }
    
    const match = processedUrl.match(/photox\/(public|thumb|original)\/(.+)/);
    if (match) {
        const pathAndFilename = match[0];
        return `https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev/${pathAndFilename}`;
    }
    
    return processedUrl;
}

export const parseTranslation = (val: any) => {
    if (!val) return { zh: '' };
    if (typeof val === 'object') return val as { zh: string; en?: string; ms?: string };
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {
      }
      return { zh: val };
    }
    return { zh: String(val) };
};

export function mapSupabasePhoto(item: SupabasePhotoRaw): Photo {
    if (!item) return {} as Photo;
    
    let storageId = item.id;
    if (item.image_url) {
      try {
        const parts = item.image_url.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          storageId = lastPart.split('.')[0];
        }
      } catch (e) {
      }
    }

    const tags: Tag[] = [];
    if (Array.isArray(item.photo_tags)) {
      item.photo_tags.forEach((pt: any) => {
        if (pt && pt.tags) {
            const rawTag = Array.isArray(pt.tags) ? pt.tags[0] : pt.tags;
            if (rawTag) {
                tags.push({
                    id: String(rawTag.id ?? pt.tag_id ?? ''),
                    name: parseTranslation(rawTag.name).zh,
                    aliases: [],
                });
            }
        }
      });
    } else if (Array.isArray(item.tags)) {
      item.tags.forEach((t: any) => {
        if (t) {
            tags.push({
                id: String(t.id),
                name: parseTranslation(t.name).zh,
                aliases: [],
            });
        }
      });
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
    
    const imageUrl = normalizeStoredUrl(item.image_url || '');
    
    return {
      id: String(item.id),
      storage_id: storageId,
      item_code: item.item_code || '',
      manual_code: item.manual_code || '',
      model_number: item.model_number || '',
      image_hash: item.image_hash || '',
      name: parseTranslation(item.name),
      category_id: category_id,
      manufacturer_id: manufacturer_id,
      description: parseTranslation(item.description),
      image_url: imageUrl,
      thumbnail_sm_url: getThumbnailUrl(imageUrl, 200, 200, item.image_hash || ''),
      thumbnail_md_url: getThumbnailUrl(imageUrl, 800, 800, item.image_hash || ''),
      thumb_hash: item.thumb_hash || '',
      exif_data: item.exif_data ?? null,
      created_at: created_at || new Date().toISOString(),
      updated_at: updated_at || created_at || new Date().toISOString(),
      group_id: group_id_val,
      group: group ? {
          id: group.id,
          name: parseTranslation(group.name),
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
      tags: tags,
      dimensions: Array.isArray(item.dimensions) ? (item.dimensions as Photo['dimensions']) : [],
      created_at_timestamp: item.created_at_timestamp,
      categoryName: '',
      manufacturerName: ''
    };
}
