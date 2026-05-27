import { type } from 'arktype';

/**
 * [API-CONTRACT-SCHEMAS-DEFINED]
 * Type-safe input and output validator contracts for Hono API routes (v2.13).
 */

// 1. Upload Presign Contracts
export const UploadPresignReqSchema = type({
  photoId: 'string',
  'contentType?': 'string',
});
export type UploadPresignReq = typeof UploadPresignReqSchema.infer;

export const UploadPresignResSchema = type({
  success: 'boolean',
  'data?': {
    uploadUrl: 'string',
    publicUrl: 'string',
  },
  'error?': 'string',
});
export type UploadPresignRes = typeof UploadPresignResSchema.infer;

// 2. R2 Delete Contracts
export const R2DeleteReqSchema = type({
  fileKeys: 'string[]',
});
export type R2DeleteReq = typeof R2DeleteReqSchema.infer;

export const R2DeleteResSchema = type({
  success: 'boolean',
  'error?': 'string',
});
export type R2DeleteRes = typeof R2DeleteResSchema.infer;

// 3. Storage Audit Contracts
export const StorageAuditResSchema = type({
  success: 'boolean',
  'data?': {
    healthy: 'number',
    missing: 'number',
    orphans: 'number',
  },
  'error?': 'string',
});
export type StorageAuditRes = typeof StorageAuditResSchema.infer;

// 4. Storage Clean Contracts
export const StorageCleanResSchema = type({
  success: 'boolean',
  'data?': {
    cleanedCount: 'number',
    files: 'string[]',
  },
  'error?': 'string',
});
export type StorageCleanRes = typeof StorageCleanResSchema.infer;

// 5. AI Analyze Contracts
export const AIAnalyzeReqSchema = type({
  base64Image: 'string',
  'customModel?': 'string',
  promptText: 'string',
});
export type AIAnalyzeReq = typeof AIAnalyzeReqSchema.infer;

// 6. AI Translate Contracts
export const AITranslateReqSchema = type({
  'customModel?': 'string',
  promptText: 'string',
});
export type AITranslateReq = typeof AITranslateReqSchema.infer;
