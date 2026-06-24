import * as v from 'valibot';
import { Photo } from './photo';
import type { 
  ApiResponse as BaseApiResponse,
  PhotoListReqSchema,
  PhotoBatchUpdateReqSchema,
  PhotoUpdateReqSchema,
  SearchReqSchema,
  PhotoListItem as ApiPhotoListItem,
} from '../../shared/apiContractSchema';
import {
  PhotoListItemSchema as ApiPhotoListItemSchema
} from '../../shared/apiContractSchema';

export type ApiResponse<T = unknown> = BaseApiResponse<T>;

export type PhotoListItem = ApiPhotoListItem;
export const PhotoListItemSchema = ApiPhotoListItemSchema;

export type PhotoListReq = v.InferOutput<typeof PhotoListReqSchema>;
export type PhotoBatchUpdateReq = v.InferOutput<typeof PhotoBatchUpdateReqSchema>;
export type PhotoUpdateReq = v.InferOutput<typeof PhotoUpdateReqSchema>;
export type SearchReq = v.InferOutput<typeof SearchReqSchema>;

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
