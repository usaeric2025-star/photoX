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

export type OldErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'UPLOAD_FAILED'
  | 'DB_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

export interface OldAppError {
  ok: false;
  error: true;
  message: string;
  code: OldErrorCode | string;
  context?: string;
  timestamp: number;
  traceId?: string;
  cause?: unknown;
}

export interface AppSuccess<T> {
  ok: true;
  data: T;
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

export type AppResult<T> = AppSuccess<T> | OldAppError;
export type Result<T, E = any> = AppResult<T>;

export interface BatchEditPayload {
  ids: string[];
  updates: Partial<Photo>;
}

export interface UpdatePhotoParams {
  id: string;
  updates: Partial<Photo>;
}
