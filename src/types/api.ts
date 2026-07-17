import * as v from 'valibot';
import { Photo } from './photo.js';
import type { 
  ApiResponse as BaseApiResponse,
  PhotoListReqSchema,
  PhotoBatchUpdateReqSchema,
  PhotoUpdateReqSchema,
  SearchReqSchema,
  PhotoListItem as ApiPhotoListItem,
} from '#shared/apiContractSchema.js';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  nextCursor?: string | null;
}

export type PhotoListItem = ApiPhotoListItem;

export interface FilterOptions {
  q?: string;
  category?: string;
  groupId?: string;
  tags?: string[];
  sort?: string;
  status?: 'active' | 'hidden' | 'deleted' | 'all';
  batch?: string;
}

export interface GroupFilterOptions {
  userId?: string;
  isAdmin?: boolean;
}

export interface BatchEditPayload {
  ids: string[];
  updates: Partial<Photo>;
}

export interface UpdatePhotoParams {
  id: string;
  updates: Partial<Photo>;
}
