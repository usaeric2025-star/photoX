/**
 * Upload System Types
 */

export interface UploadTask {
  file: File;
  hash: string;          // Pre-calculated SHA-256
  groupId?: string | null;
}

export interface UploadResult {
  id?: string;
  success: boolean;
  duplicate?: boolean;
  error?: string;
  fallback?: boolean;    // Whether original was used due to compression failure/timeout
  imageUrl?: string;
}

export interface CompressedResult {
  blob: Blob;
  width: number;
  height: number;
  fallback: boolean;     // Whether it returned the original file
}

export interface PhotoRecord {
  id?: string;
  imageUrl: string;
  imageHash: string;
  width: number;
  height: number;
  name?: string;
  description?: string;
  manualCode?: string;
  groupId?: string | null;
}
