import { type } from 'arktype';

/**
 * [API-CONTRACT-SCHEMAS-DEFINED]
 * Type-safe input and output validator contracts for Hono API routes (v2.13).
 */

// 1. Upload Presign Contracts
export const UploadPresignReqSchema = type({
  photoId: 'string',
  'fileKey?': 'string',
  'contentType?': 'string',
  'imageHash?': 'string',
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
    formatDistribution: {
      avif: 'number',
      webp: 'number',
      jpg: 'number',
      other: 'number',
    },
    orphanedFiles: type({
      key: 'string',
      size: 'number',
      lastModified: 'string',
    }).array(),
    missingReferences: type({
      dbId: 'string',
      expectedKey: 'string',
    }).array(),
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

// 5. AI Task Contracts
export const AIRunReqSchema = type({
  task: 'string',
  'imageUrl?': 'string',
  'prompt?': 'string',
});

export const AIAnalyzeV1ReqSchema = type({
  'photoId?': 'string',
  'imageUrl?': 'string',
});

export const AIAnalyzeBase64ReqSchema = type({
  base64Image: 'string',
  'customModel?': 'string',
  'promptText?': 'string',
});

export const AITranslateReqSchema = type({
  'customModel?': 'string',
  promptText: 'string',
});

export const AIAnalyzeGroupReqSchema = type({
  photoDetails: 'string',
});

export const AIAnalyzePhotoV2ReqSchema = type({
  photoDetail: 'string',
});

// 6. Common API Response Standard (Used by backend internally for assertion)
export const ApiResponseSchema = type({
  success: 'boolean',
  'data?': 'any',
  'error?': 'string',
});
export type ApiResponse = typeof ApiResponseSchema.infer;

// 7. Batch Update Photo Contracts (Independent from individual updates)
export const photoBatchItemSchema = type({
  id: 'string',
  updates: type({
    category_id: 'string|null',
    group_id: 'string|null',
    is_hidden: 'boolean|null',
    item_code: 'string|null',
  }),
});

// 8. Maintenance Job Contracts
export const MaintenanceJobSchema = type({
  status: "'processing' | 'completed' | 'failed' | 'cancelled'",
  progress: 'number',
  processed: 'number',
  total: 'number',
  message: 'string',
  'error?': 'string',
});
export type MaintenanceJob = typeof MaintenanceJobSchema.infer;

export const ImportOrphansReqSchema = type({
  'userId?': 'string',
});
export type ImportOrphansReq = typeof ImportOrphansReqSchema.infer;
