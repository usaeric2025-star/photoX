import { Photo } from './photo';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error?: string | Error | null;
  count?: number;
  status?: number;
}

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'UPLOAD_FAILED'
  | 'DB_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

export interface AppError {
  ok: false;
  error: true;
  message: string;
  code: ErrorCode;
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

export type AppResult<T> = AppSuccess<T> | AppError;
export type Result<T, E = any> = AppResult<T>;

export interface BatchEditPayload {
  ids: string[];
  updates: Partial<Photo>;
}

export interface UpdatePhotoParams {
  id: string;
  updates: Partial<Photo>;
}
