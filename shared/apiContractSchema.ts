import * as v from 'valibot';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string | { message: string; code?: string; traceId?: string };
    text?: string;
    usage?: JsonObject;
    rawResult?: string;
};

export const AIAnalyzeV1ReqSchema = v.object({
    photoId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
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
    promptText: v.optional(v.string()),
    provider: v.optional(v.string())
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

const TranslationSchema = v.object({
    zh: v.string(),
    en: v.optional(v.string()),
    ms: v.optional(v.string())
});

export const PhotoListItemSchema = v.object({
    id: v.string(),
    name: v.string(),
    description: v.optional(v.nullable(TranslationSchema)),
    imageUrl: v.string(),
    thumbnailUrl: v.string(),
    imageHash: v.optional(v.nullable(v.string())),
    groupId: v.optional(v.nullable(v.string())),
    groupName: v.optional(v.nullable(v.string())),
    categoryId: v.optional(v.nullable(v.union([v.number(), v.string()]))),
    categoryName: v.optional(v.nullable(v.string())),
    categoryDescription: v.optional(v.nullable(TranslationSchema)),
    memberCount: v.number(),
    tags: v.array(v.string()),
    isPinned: v.optional(v.boolean()),
    isHidden: v.optional(v.boolean()),
    isGroupCover: v.optional(v.boolean()),
    isCover: v.optional(v.boolean()),
    createdAt: v.optional(v.nullable(v.string()))
});

export type PhotoListItem = v.InferOutput<typeof PhotoListItemSchema>;

export const PhotoBatchUpdateReqSchema = v.object({
    ids: v.array(v.string()),
    updates: v.record(v.string(), v.unknown())
});

export const PhotoUpdateReqSchema = v.object({
    id: v.string(),
    updates: v.record(v.string(), v.unknown())
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
    isGlobal: v.optional(v.boolean()),
    hotScore: v.optional(v.number())
});

export const TagReqSchema = v.object({
    id: v.optional(v.number()),
    name: v.optional(v.string()),
    description: v.optional(v.nullable(TranslationSchema)),
    aliases: v.optional(v.array(v.string()))
});

const CategoryListItemSchema = v.object({
    id: v.number(),
    code: v.string(),
    name: v.string(),
    description: v.optional(v.nullable(TranslationSchema)),
    zh: v.optional(v.string()),
    en: v.optional(v.string()),
    ms: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    subcategories: v.optional(v.array(v.any()), [])
});

export const CategoryReqSchema = v.object({
    id: v.optional(v.number()),
    code: v.string(),
    name: v.string(),
    description: v.optional(v.nullable(TranslationSchema)),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean())
});

const ManufacturerListItemSchema = v.object({
    id: v.string(),
    name: v.string()
});

export const ManufacturerReqSchema = v.object({
    id: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.nullable(TranslationSchema)),
    aliases: v.optional(v.array(v.string()))
});

export const GroupReqSchema = v.object({
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.nullable(TranslationSchema)),
    coverPhotoId: v.optional(v.nullable(v.string())),
    status: v.optional(v.union([v.literal('active'), v.literal('confirmed'), v.literal('rejected')]))
});

const DimensionSchema = v.object({
    label: v.string(),
    unit: v.union([v.literal('cm'), v.literal('inch'), v.literal('mm')]),
    length: v.number(),
    width: v.number(),
    height: v.number(),
    part: v.optional(v.string()),
    isAi: v.optional(v.boolean()),
    isAiEstimated: v.optional(v.boolean())
});

const TagSchema = v.object({
    id: v.number(),
    name: v.string(),
    aliases: v.optional(v.array(v.string())),
    userId: v.optional(v.string()),
    isGlobal: v.optional(v.boolean()),
    hotScore: v.optional(v.number())
});

export const PhotoSchema = v.object({
    id: v.optional(v.string()),
    name: v.string(),
    categoryId: v.optional(v.nullable(v.string())),
    manufacturerId: v.optional(v.nullable(v.string())),
    tags: v.pipe(
        v.array(TagSchema),
        v.check((data) => data.length <= 3, '最多只能有3个标签')
    ),
    description: TranslationSchema,
    itemCode: v.string(),
    manualCode: v.string(),
    modelNumber: v.string(),
    dimensions: v.array(DimensionSchema),
    isHidden: v.boolean(),
    price: v.string(),
    isGroupCover: v.boolean(),
    groupId: v.optional(v.nullable(v.string())),
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
    createdAt: v.optional(v.string()),
    message: v.optional(v.string()),
    processed: v.optional(v.number()),
    total: v.optional(v.number())
});
