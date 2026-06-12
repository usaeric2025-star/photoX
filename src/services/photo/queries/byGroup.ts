import { ErrorFactory, success } from '@/lib/error/ErrorFactory';
import { withErrorHandling } from '@/lib/error/wrapper';
import { Photo } from '@/types';
import { AppResult } from '@/types/api';
import { PAGINATION } from '@/config/constants';
import { api } from '@/lib/api';
import { loadTagsFromCloud } from '../../tag';
import { mapSupabasePhoto } from '../mappers';

/**
 * Loads photos belonging to a group
 */
export const getPhotosByGroup = async (groupId: string, isAdminMode: boolean = false): Promise<AppResult<Photo[]>> => {
  if (!groupId) return success([]);
  return withErrorHandling(async () => {
    const res = await api.photos['list-by-group'].$post({
      json: { groupId, isAdminMode }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to load photos by group'), 'queries');
    const { data } = await res.json();
    const allTags = await loadTagsFromCloud();
    return success((data || []).map((item: any) => mapSupabasePhoto(item, allTags)));
  }, 'loadPhotosByGroupId');
};

/**
 * Loads photos belonging to a group (paginated)
 */
export const getPhotosByGroupPaginated = async (
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
    if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to load paginated group photos'), 'queries');
    const { data } = await res.json();
    const allTags = await loadTagsFromCloud();
    return { 
      photos: (data.photos || []).map((item: any) => mapSupabasePhoto(item, allTags)), 
      total: data.total || 0 
    };
  }, 'loadPhotosByGroupIdPaginated');
};
