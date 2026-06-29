import * as v from 'valibot';

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

export const AIAnalyzeV1ReqSchema = v.object({
    photoId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    image_url: v.optional(v.string()),
    prompt: v.optional(v.string()),
    provider: v.optional(v.union([v.literal('agnes'), v.literal('openrouter')])),
    model: v.optional(v.string())
});

export const AIRunReqSchema = v.object({
    task: v.string(),
    imageUrl: v.optional(v.string()),
    prompt: v.optional(v.string())
});

export const AIAnalyzeBase64ReqSchema = v.object({
    base64Image: v.string(),
    customModel: v.optional(v.string()),
    promptText: v.optional(v.string())
});

export const AITranslateReqSchema = v.object({
    promptText: v.string(),
    customModel: v.optional(v.string())
});

export const AIClusterPhotosReqSchema = v.object({
    photoIds: v.array(v.string())
});

export const AIAnalyzeGroupReqSchema = v.object({
    photoDetails: v.string()
});

export const AIAnalyzePhotoV2ReqSchema = v.object({
    photoDetail: v.string(),
    photoId: v.optional(v.string())
});

const StorageAuditResSchema = v.object({
    healthyCount: v.number(),
    ghosts: v.object({
        count: v.number(),
        samples: v.array(v.record(v.string(), v.unknown()))
    }),
    orphans: v.object({
        count: v.number(),
        samples: v.array(v.record(v.string(), v.unknown()))
    }),
    truncated: v.optional(v.boolean()),
    formatDistribution: v.optional(v.object({
        avif: v.number(),
        webp: v.number(),
        jpg: v.number(),
        other: v.number()
    }))
});

const ImportOrphansReqSchema = v.object({
    urls: v.array(v.string()),
    groupId: v.optional(v.string()),
    userId: v.optional(v.string())
});

export const PhotoListReqSchema = v.object({
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.nullable(v.string())),
    categoryId: v.optional(v.nullable(v.union([v.string(), v.number()]))),
    tagId: v.optional(v.nullable(v.union([v.string(), v.number()]))),
    searchQuery: v.optional(v.nullable(v.string())),
    isAdminMode: v.optional(v.boolean()),
    sortOrder: v.optional(v.nullable(v.string())),
    onlyUngrouped: v.optional(v.boolean()),
    onlyGroupsCover: v.optional(v.boolean()),
    groupId: v.optional(v.nullable(v.string())),
    manufacturerId: v.optional(v.nullable(v.union([v.string(), v.number()]))),
    isHidden: v.optional(v.nullable(v.boolean()))
});

export const PhotoListItemSchema = v.object({
    id: v.string(),
    name: v.string(),
    description: v.optional(v.nullable(v.string())),
    imageUrl: v.string(),
    thumbnailUrl: v.string(),
    groupId: v.optional(v.nullable(v.string())),
    groupName: v.optional(v.nullable(v.string())),
    memberCount: v.number(),
    tags: v.array(v.string()),
    isPinned: v.optional(v.boolean()),
    isHidden: v.optional(v.boolean()),
    isCover: v.optional(v.boolean()),
    createdAt: v.optional(v.nullable(v.string()))
});

export type PhotoListItem = v.InferOutput<typeof PhotoListItemSchema>;

export const PhotoListResSchema = v.object({
    success: v.boolean(),
    data: v.array(PhotoListItemSchema),
    nextCursor: v.nullable(v.string()),
    total: v.number()
});

export const PhotoBatchUpdateReqSchema = v.object({
    ids: v.array(v.string()),
    updates: v.record(v.string(), v.unknown())
});

export const PhotoUpdateReqSchema = v.object({
    id: v.string(),
    updates: v.record(v.string(), v.unknown())
});

export const PhotoIdReqSchema = v.object({
    id: v.string(),
    userId: v.optional(v.string())
});

export const PhotoIdsReqSchema = v.object({
    ids: v.array(v.string())
});

export const PhotoCheckHashReqSchema = v.object({
    hash: v.string()
});

export const ListByGroupReqSchema = v.object({
    groupId: v.string(),
    isAdminMode: v.optional(v.boolean()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number())
});

const TagListItemSchema = v.object({
    id: v.number(),
    name: v.string(),
    aliases: v.optional(v.array(v.string())),
    is_global: v.optional(v.boolean()),
    hot_score: v.optional(v.number())
});

export const TagReqSchema = v.object({
    id: v.number(),
    name: v.optional(v.string()),
    aliases: v.optional(v.array(v.string()))
});

const CategoryListItemSchema = v.object({
    id: v.number(),
    code: v.string(),
    name: v.string(),
    zh: v.optional(v.string()),
    en: v.optional(v.string()),
    ms: v.optional(v.string()),
    sort_order: v.optional(v.number()),
    subcategories: v.optional(v.array(v.any()), [])
});

export const CategoryReqSchema = v.object({
    id: v.optional(v.union([v.string(), v.number()])),
    code: v.string(),
    name_zh: v.string(),
    name_en: v.optional(v.string()),
    name_ms: v.optional(v.string()),
    sort_order: v.optional(v.number()),
    is_active: v.optional(v.boolean())
});

const ManufacturerListItemSchema = v.object({
    id: v.string(),
    name: v.string()
});

export const ManufacturerReqSchema = v.object({
    id: v.optional(v.string()),
    name: v.string(),
    aliases: v.optional(v.array(v.string()))
});

export const GroupReqSchema = v.object({
    id: v.string(),
    name: v.optional(v.string()),
    cover_photo_id: v.optional(v.string()),
    status: v.optional(v.union([v.literal('draft'), v.literal('confirmed')]))
});

const TranslationSchema = v.object({
    zh: v.string(),
    en: v.optional(v.string()),
    ms: v.optional(v.string())
});

const DimensionSchema = v.object({
    label: v.string(),
    unit: v.union([v.literal('cm'), v.literal('inch'), v.literal('mm')]),
    length: v.number(),
    width: v.number(),
    height: v.number(),
    part: v.optional(v.string()),
    is_ai: v.optional(v.boolean()),
    is_ai_estimated: v.optional(v.boolean())
});

const TagSchema = v.object({
    id: v.number(),
    name: v.string(),
    aliases: v.optional(v.array(v.string())),
    user_id: v.optional(v.string()),
    is_global: v.optional(v.boolean()),
    hot_score: v.optional(v.number())
});

export const PhotoSchema = v.object({
    id: v.optional(v.string()),
    name: TranslationSchema,
    category_id: v.optional(v.nullable(v.string())),
    manufacturer_id: v.optional(v.nullable(v.string())),
    tags: v.pipe(
        v.array(TagSchema),
        v.check((data) => data.length <= 3, '最多隻能有3個標籤')
    ),
    description: TranslationSchema,
    item_code: v.string(),
    manual_code: v.string(),
    model_number: v.string(),
    dimensions: v.array(DimensionSchema),
    is_hidden: v.boolean(),
    price: v.string(),
    is_group_cover: v.boolean(),
    group_id: v.optional(v.nullable(v.string())),
    uri: v.optional(v.string())
});

export const SearchReqSchema = v.object({
    query: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
});

const MaintenanceJobSchema = v.object({
    id: v.optional(v.string()),
    task: v.optional(v.string()),
    status: v.union([v.literal('pending'), v.literal('running'), v.literal('completed'), v.literal('failed'), v.literal('processing')]),
    progress: v.number(),
    result: v.optional(v.unknown()),
    error: v.optional(v.string()),
    created_at: v.optional(v.string()),
    message: v.optional(v.string()),
    processed: v.optional(v.number()),
    total: v.optional(v.number())
});
