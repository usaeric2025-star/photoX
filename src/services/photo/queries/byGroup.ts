import { Photo } from '@/types';
import { PAGINATION } from '@/config/constants';
import { api } from '@/lib/api';
import { loadTagsFromCloud } from '../../tag';
import { mapSupabasePhoto } from '../mappers';

/**
 * Loads photos belonging to a group
 */
export const getPhotosByGroup = async (groupId: string, isAdminMode: boolean = false): Promise<Photo[]> => {
  if (!groupId) return [];
  const res = await api.photos['list-by-group'].$post({
    json: { groupId, isAdminMode }
  });
  if (!res.ok) throw new Error('Failed to load photos by group');
  const { data } = await res.json();
  return (data || []).map((item: any) => mapSupabasePhoto(item));
};

/**
 * Loads photos belonging to a group (paginated)
 */
export const getPhotosByGroupPaginated = async (
  groupId: string,
  page: number = 1,
  pageSize: number = PAGINATION.GROUP_PAGE_SIZE,
  isAdminMode: boolean = false
): Promise<{ photos: Photo[]; total: number }> => {
  if (!groupId) return { photos: [], total: 0 };
  const res = await api.photos['list-by-group-paginated'].$post({
    json: { groupId, page, pageSize, isAdminMode }
  });
  if (!res.ok) throw new Error('Failed to load paginated group photos');
  const { data } = await res.json();
  return { 
    photos: (data.photos || []).map((item: any) => mapSupabasePhoto(item)), 
    total: data.total || 0 
  };
};
