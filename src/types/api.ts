import { Photo } from './photo';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error?: string | Error | null;
  count?: number;
  status?: number;
}

export interface BatchEditPayload {
  ids: string[];
  updates: Partial<Photo>;
}

export interface UpdatePhotoParams {
  id: string;
  updates: Partial<Photo>;
}
