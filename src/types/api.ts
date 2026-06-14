import { Photo } from './photo';
import type { 
  ApiResponse as BaseApiResponse,
  PhotoListReqSchema,
  PhotoBatchUpdateReqSchema,
  PhotoUpdateReqSchema,
  SearchReqSchema
} from '../../api/_shared/apiContractSchema';

export type ApiResponse<T = unknown> = BaseApiResponse<T>;

export type PhotoListReq = typeof PhotoListReqSchema.infer;
export type PhotoBatchUpdateReq = typeof PhotoBatchUpdateReqSchema.infer;
export type PhotoUpdateReq = typeof PhotoUpdateReqSchema.infer;
export type SearchReq = typeof SearchReqSchema.infer;

export interface StandardError {
  code: string;
  message: string;
  context: string;
  traceId?: string;
  timestamp: number;
  stack?: string;
  details?: unknown;
}

export interface BatchEditPayload {
  ids: string[];
  updates: Partial<Photo>;
}

export interface UpdatePhotoParams {
  id: string;
  updates: Partial<Photo>;
}
