import { type } from "arktype";

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string;
    text?: string;
    usage?: JsonObject;
    raw_result?: string;
};

export const AIAnalyzeV1ReqSchema = type({
    "photoId?": "string",
    "imageUrl?": "string",
    "image_url?": "string",
    "prompt?": "string",
    "provider?": "'agnes' | 'openrouter'",
    "model?": "string"
});

export const AIRunReqSchema = type({
    task: "string",
    "imageUrl?": "string",
    "prompt?": "string"
});

export const AIAnalyzeBase64ReqSchema = type({
    base64Image: "string",
    "customModel?": "string",
    "promptText?": "string"
});

export const AITranslateReqSchema = type({
    promptText: "string",
    "customModel?": "string"
});

export const AIClusterPhotosReqSchema = type({
    photoIds: "string[]"
});

export const AIAnalyzeGroupReqSchema = type({
    photoDetails: "string"
});

export const AIAnalyzePhotoV2ReqSchema = type({
    photoDetail: "string",
    "photoId?": "string"
});

export const StorageAuditResSchema = type({
    healthyCount: "number",
    ghosts: {
        count: "number",
        samples: "object[]"
    },
    orphans: {
        count: "number",
        samples: "object[]"
    },
    "truncated?": "boolean",
    "formatDistribution?": {
        avif: "number",
        webp: "number",
        jpg: "number",
        other: "number"
    }
});

export const ImportOrphansReqSchema = type({
    urls: "string[]",
    "groupId?": "string",
    "userId?": "string"
});

export const PhotoListReqSchema = type({
    "page?": "number",
    "limit?": "number",
    "cursor?": "string|null",
    "categoryId?": "string|number|null",
    "tagId?": "string|number|null",
    "searchQuery?": "string|null",
    "isAdminMode?": "boolean",
    "sortOrder?": "string|null",
    "onlyUngrouped?": "boolean",
    "onlyGroupsCover?": "boolean",
    "groupId?": "string|null",
    "manufacturerId?": "string|number|null",
    "isHidden?": "boolean|null"
});

export const PhotoListItemSchema = type({
    id: "string",
    name: "string",
    "description?": "string|null",
    imageUrl: "string",
    thumbnailUrl: "string",
    "groupId?": "string|null",
    "groupName?": "string|null",
    memberCount: "number",
    tags: "string[]",
    "isPinned?": "boolean",
    "isHidden?": "boolean",
    "isCover?": "boolean",
    "createdAt?": "string|null"
});

export type PhotoListItem = typeof PhotoListItemSchema.infer;

const PhotoListResSchema = type({
    photos: PhotoListItemSchema.array(),
    nextCursor: "string|null",
    total: "number"
});

export const PhotoBatchUpdateReqSchema = type({
    ids: "string[]",
    updates: "object"
});

export const PhotoUpdateReqSchema = type({
    id: "string",
    updates: "object"
});

export const PhotoIdReqSchema = type({
    id: "string",
    "userId?": "string"
});

export const PhotoIdsReqSchema = type({
    ids: "string[]"
});

export const PhotoCheckHashReqSchema = type({
    hash: "string"
});

export const ListByGroupReqSchema = type({
    groupId: "string",
    "isAdminMode?": "boolean",
    "page?": "number",
    "pageSize?": "number"
});

const TagListItemSchema = type({
    id: "number",
    name: "string",
    "aliases?": "string[]",
    "is_global?": "boolean",
    "hot_score?": "number"
});

export const TagReqSchema = type({
    id: "number",
    "name?": "string",
    "aliases?": "string[]"
});

const CategoryListItemSchema = type({
    id: "string|number",
    code: "string",
    name: "string",
    "zh?": "string",
    "en?": "string",
    "ms?": "string",
    "sort_order?": "number"
});

export const CategoryReqSchema = type({
    "id?": "string|number",
    code: "string",
    name_zh: "string",
    "name_en?": "string",
    "name_ms?": "string",
    "sort_order?": "number",
    "is_active?": "boolean"
});

const ManufacturerListItemSchema = type({
    id: "string",
    name: "string"
});

export const ManufacturerReqSchema = type({
    "id?": "string",
    name: "string",
    "aliases?": "string[]"
});

export const GroupReqSchema = type({
    id: "string",
    "name?": "string",
    "cover_photo_id?": "string",
    "status?": "'draft' | 'confirmed'"
});

export const PhotoSchema = type({
    "id?": "string",
    name: {
        zh: "string",
        "en?": "string",
        "ms?": "string"
    },
    "category_id?": "string|null",
    "manufacturer_id?": "string|null",
    tags: type({
        id: "number",
        name: "string",
        "aliases?": "string[]",
        "user_id?": "string",
        "is_global?": "boolean",
        "hot_score?": "number"
    }).array().narrow((data) => data.length <= 3),
    description: {
        "zh?": "string",
        "en?": "string",
        "ms?": "string"
    },
    item_code: "string",
    manual_code: "string",
    model_number: "string",
    dimensions: type({
        label: "string",
        unit: "'cm' | 'inch' | 'mm'",
        length: "number",
        width: "number",
        height: "number",
        "part?": "string",
        "is_ai?": "boolean",
        "is_ai_estimated?": "boolean"
    }).array(),
    is_hidden: "boolean",
    price: "string",
    is_group_cover: "boolean",
    "group_id?": "string|null",
    "uri?": "string"
});

export const SearchReqSchema = type({
    query: "string",
    "limit?": "number",
    "offset?": "number"
});

export interface MaintenanceJob {
    id?: string;
    task?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'processing';
    progress: number;
    result?: unknown;
    error?: string;
    created_at?: string;
    message?: string;
    processed?: number;
    total?: number;
}

export const MaintenanceJobSchema = type({
    "id?": "string",
    "task?": "string",
    status: "'pending' | 'running' | 'completed' | 'failed' | 'processing'",
    progress: "number",
    "result?": "unknown",
    "error?": "string",
    "created_at?": "string",
    "message?": "string",
    "processed?": "number",
    "total?": "number"
});
