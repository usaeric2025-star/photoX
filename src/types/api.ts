import * as v from 'valibot';
import { Photo } from './photo';
import type { 
  ApiResponse as BaseApiResponse,
  PhotoListReqSchema,
  PhotoBatchUpdateReqSchema,
  PhotoUpdateReqSchema,
  SearchReqSchema,
  PhotoListItem as ApiPhotoListItem,
} from '@/shared/apiContractSchema';


export type ApiResponse<T = unknown> = BaseApiResponse<T>;

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
