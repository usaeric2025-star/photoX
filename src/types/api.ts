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


export type ApiResponse<T = unknown> = BaseApiResponse<T>;

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  nextCursor?: string | null;
}

export type PhotoListItem = ApiPhotoListItem;

interface FilterOptions {
  q?: string;
  category?: string;
  groupId?: string;
  tags?: string[];
  sort?: string;
  status?: 'active' | 'hidden' | 'deleted' | 'all';
  batch?: string;
}

interface GroupFilterOptions {
  q?: string;
  sort?: string;
  userId?: string;
  isAdmin?: boolean;
}

interface BatchEditPayload {
  ids: string[];
  updates: Partial<Photo>;
}

interface UpdatePhotoParams {
  id: string;
  updates: Partial<Photo>;
}
