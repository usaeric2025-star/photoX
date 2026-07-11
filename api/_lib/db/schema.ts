import { pgTable, text, timestamp, boolean, uuid, jsonb, numeric, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Categories Table
 */
export const categories = pgTable('categories', {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    code: text().unique(),
    nameZh: text(),
    nameEn: text(),
    nameMs: text(),
    sortOrder: integer().default(0),
    isActive: boolean().default(true),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
});

/**
 * Manufacturers Table
 */
export const manufacturers = pgTable('manufacturers', {
    id: uuid().primaryKey(),
    name: text(),
    aliases: text().array(),
    createdAt: timestamp().defaultNow(),
});

/**
 * Groups Table
 */
export const groups = pgTable('groups', {
    id: uuid().primaryKey(),
    name: text(),
    description: jsonb(),
    coverPhotoId: uuid(),
    status: text(),
    userId: uuid(),
    isHidden: boolean().default(false),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
});

/**
 * Furniture Items (Primary Table)
 */
export const furnitureItems = pgTable('furniture_items', {
    id: uuid().primaryKey(),
    userId: uuid(),
    name: text(),
    description: jsonb(),
    categoryId: integer().references(() => categories.id, { onDelete: 'set null' }),
    manufacturerId: uuid().references(() => manufacturers.id, { onDelete: 'set null' }),
    groupId: uuid().references(() => groups.id, { onDelete: 'set null' }),
    isGroupCover: boolean().default(false),
    isPinned: boolean().default(false),
    imageUrl: text(),
    imageHash: text(),
    price: text(),
    note: text(),
    type: text(),
    isHidden: boolean().default(false),
    itemCode: text(),
    manualCode: text(),
    modelNumber: text(),
    descriptionTranslations: jsonb(),
    isAnalyzing: boolean().default(false),
    subCategory: text(),
    dimensions: jsonb(),
    groupOrder: integer(),
    metadata: jsonb(),
    updatedAt: timestamp().defaultNow(),
    createdAt: timestamp().defaultNow(),
    nameSearchable: text(),
}, (t) => ({
    userIdCreatedAtIdx: index('furniture_items_user_id_created_at_idx').on(t.userId, t.createdAt),
    groupIdIdx: index('furniture_items_group_id_idx').on(t.groupId),
    categoryIdIdx: index('furniture_items_category_id_idx').on(t.categoryId),
    imageHashIdx: index('furniture_items_image_hash_idx').on(t.imageHash),
    userIdIdx: index('furniture_items_user_id_idx').on(t.userId),
    isPinnedIdx: index('furniture_items_is_pinned_idx').on(t.isPinned),
    isHiddenIdx: index('furniture_items_is_hidden_idx').on(t.isHidden),
    createdAtIdx: index('furniture_items_created_at_idx').on(t.createdAt),
    manufacturerIdIdx: index('furniture_items_manufacturer_id_idx').on(t.manufacturerId),
    manualCodeIdx: index('furniture_items_manual_code_idx').on(t.manualCode),
    modelNumberIdx: index('furniture_items_model_number_idx').on(t.modelNumber),
    itemCodeIdx: index('furniture_items_item_code_idx').on(t.itemCode),
}));

/**
 * Tags Table
 */
export const tags = pgTable('tags', {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    name: text().unique(),
    isPinned: boolean().default(false),
    usageCount: integer().default(0),
    isHot: boolean().default(false),
    createdAt: timestamp().defaultNow(),
}, (t) => ({
    usageCountIdx: index('tags_usage_count_idx').on(t.usageCount),
    isPinnedIdx: index('tags_is_pinned_idx').on(t.isPinned),
}));

/**
 * Junction table for Furniture Items and Tags
 */
export const photoTags = pgTable('photo_tags', {
    photoId: uuid().references(() => furnitureItems.id, { onDelete: 'cascade' }),
    tagId: integer().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.photoId, t.tagId] }),
    tagIdIdx: index('photo_tags_tag_id_idx').on(t.tagId),
    photoIdIdx: index('photo_tags_photo_id_idx').on(t.photoId),
}));

/**
 * Secrets / Settings Table
 */
export const secrets = pgTable('secrets', {
    key: text().primaryKey(),
    value: text(),
    updatedAt: timestamp().defaultNow(),
});

/**
 * System Logs Table
 */
export const systemLogs = pgTable('system_logs', {
    id: integer().primaryKey().generatedByDefaultAsIdentity(), // Match bigint identity in DB
    level: text(), 
    operation: text(),
    message: text(),
    resource: text(),
    traceId: text(),
    metadata: jsonb(),
    errorMessage: text(),
    stackTrace: text(),
    componentStack: text(),
    url: text(),
    userId: uuid(),
    stack: text(),
    context: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow(),
});

/**
 * Tasks Table (Queue Management)
 */
export const tasks = pgTable('tasks', {
    id: uuid().primaryKey().defaultRandom(),
    label: text().notNull(),
    type: text().notNull(),
    status: text().notNull(),
    meta: jsonb(),
    data: jsonb(),
    userId: uuid(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
}, (t) => [
    index('idx_tasks_status').on(t.status),
    index('idx_tasks_created_at').on(t.createdAt),
    index('idx_tasks_user_id').on(t.userId),
]);

/**
 * Maintenance Jobs Table
 */
export const maintenanceJobs = pgTable('maintenance_jobs', {
    id: uuid().primaryKey().defaultRandom(),
    status: text().default('pending'),
    operation: text(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
});

/**
 * Settings Table (Legacy/Global Config)
 */
export const settings = pgTable('settings', {
    id: integer().primaryKey(),
    logoUrl: text(),
    whatsapp1: text('whatsapp_1'),
    whatsapp2: text('whatsapp_2'),
    whatsapp1Name: text('whatsapp_1_name'),
    whatsapp2Name: text('whatsapp_2_name'),
    accessPasscode: text(),
    passcodeEnabled: boolean(),
    hotTagThreshold: integer(),
    hotTagsCount: integer(),
    openrouterModel: text(),
    agnesModel: text(),
    updatedAt: timestamp().defaultNow(),
    createdAt: timestamp().defaultNow(),
});

/**
 * AI Audit Logs Table
 */
export const aiAuditLogs = pgTable('ai_audit_logs', {
    id: uuid().primaryKey().defaultRandom(),
    photoId: uuid().references(() => furnitureItems.id),
    model: text(),
    promptVersion: text(),
    cleanedOutput: jsonb(),
    rawOutput: jsonb(),
    latencyMs: integer(),
    costEst: text(),
    tokenUsage: jsonb(),
    status: text(),
    errorMessage: text(),
    rawStoragePath: text(),
    createdAt: timestamp().defaultNow(),
}, (table) => ({
    photoIdIdx: index('ai_audit_logs_photo_id_idx').on(table.photoId),
    createdAtIdx: index('ai_audit_logs_created_at_idx').on(table.createdAt),
}));

/**
 * Group Correction Logs Table
 */
export const groupCorrectionLogs = pgTable('group_correction_logs', {
    id: uuid().primaryKey().defaultRandom(),
    operation: text(),
    inputPhotoIds: jsonb(),
    createdGroups: jsonb(),
    userId: text(),
    createdAt: timestamp().defaultNow(),
});

/**
 * Users Table (Metadata for references)
 */
export const users = pgTable('users', {
    id: text().primaryKey(),
    email: text(),
    createdAt: timestamp().defaultNow(),
});

// --- Relations ---

export const furnitureItemsRelations = relations(furnitureItems, ({ one, many }) => ({
    category: one(categories, {
        fields: [furnitureItems.categoryId],
        references: [categories.id],
    }),
    manufacturer: one(manufacturers, {
        fields: [furnitureItems.manufacturerId],
        references: [manufacturers.id],
    }),
    group: one(groups, {
        fields: [furnitureItems.groupId],
        references: [groups.id],
    }),
    tags: many(photoTags),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
    items: many(furnitureItems),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
    items: many(furnitureItems),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
    items: many(photoTags),
}));

export const photoTagsRelations = relations(photoTags, ({ one }) => ({
    photo: one(furnitureItems, {
        fields: [photoTags.photoId],
        references: [furnitureItems.id],
    }),
    tag: one(tags, {
        fields: [photoTags.tagId],
        references: [tags.id],
    }),
}));
