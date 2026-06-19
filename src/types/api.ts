import { Photo } from './photo';
import type { 
  ApiResponse as BaseApiResponse,
  PhotoListReqSchema,
  PhotoBatchUpdateReqSchema,
  PhotoUpdateReqSchema,
  SearchReqSchema,
  PhotoListItem as ApiPhotoListItem,
} from '../../api/_shared/apiContractSchema';
import {
  PhotoListItemSchema as ApiPhotoListItemSchema
} from '../../api/_shared/apiContractSchema';

export type ApiResponse<T = unknown> = BaseApiResponse<T>;

export type PhotoListItem = ApiPhotoListItem;
export const PhotoListItemSchema = ApiPhotoListItemSchema;

type PhotoListReq = typeof PhotoListReqSchema.infer;
type PhotoBatchUpdateReq = typeof PhotoBatchUpdateReqSchema.infer;
type PhotoUpdateReq = typeof PhotoUpdateReqSchema.infer;
type SearchReq = typeof SearchReqSchema.infer;

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

export interface StandardError {
  code: string;
  message: string;
  context: string;
  traceId?: string;
  timestamp: number;
  stack?: string;
  details?: unknown;
}

interface BatchEditPayload {
  ids: string[];
  updates: Partial<Photo>;
}

interface UpdatePhotoParams {
  id: string;
  updates: Partial<Photo>;
}
