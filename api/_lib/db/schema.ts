import { pgTable, text, timestamp, boolean, uuid, jsonb, numeric, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Categories Table
 */
export const categories = pgTable('categories', {
    id: integer('id').primaryKey(),
    code: text('code').unique(),
    nameZh: text('name_zh'),
    nameEn: text('name_en'),
    nameMs: text('name_ms'),
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Manufacturers Table
 */
export const manufacturers = pgTable('manufacturers', {
    id: uuid('id').primaryKey(),
    name: text('name'),
    aliases: text('aliases').array(),
    createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Groups Table
 */
export const groups = pgTable('groups', {
    id: uuid('id').primaryKey(),
    name: text('name'),
    description: text('description'),
    coverPhotoId: uuid('cover_photo_id'),
    status: text('status'),
    userId: uuid('user_id'),
    isHidden: boolean('is_hidden').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Furniture Items (Primary Table)
 */
export const furnitureItems = pgTable('furniture_items', {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id'),
    name: text('name'),
    description: jsonb('description'),
    categoryId: integer('category_id').references(() => categories.id),
    manufacturerId: uuid('manufacturer_id').references(() => manufacturers.id),
    groupId: uuid('group_id').references(() => groups.id),
    isGroupCover: boolean('is_group_cover').default(false),
    isPinned: boolean('is_pinned').default(false),
    imageUrl: text('image_url'),
    imageHash: text('image_hash'),
    price: text('price'),
    note: text('note'),
    type: text('type'),
    isHidden: boolean('is_hidden').default(false),
    itemCode: text('item_code'),
    manualCode: text('manual_code'),
    modelNumber: text('model_number'),
    descriptionTranslations: jsonb('description_translations'),
    isAnalyzing: boolean('is_analyzing').default(false),
    subCategory: text('sub_category'),
    dimensions: jsonb('dimensions'),
    groupOrder: integer('group_order'),
    metadata: jsonb('metadata'),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    nameSearchable: text('name_searchable'),
}, (t) => ({
    userIdCreatedAtIdx: index('furniture_items_user_id_created_at_idx').on(t.userId, t.createdAt),
    groupIdIdx: index('furniture_items_group_id_idx').on(t.groupId),
    categoryIdIdx: index('furniture_items_category_id_idx').on(t.categoryId),
}));

/**
 * Tags Table
 */
export const tags = pgTable('tags', {
    id: integer('id').primaryKey(),
    name: text('name').unique(),
    isPinned: boolean('is_pinned').default(false),
    usageCount: integer('usage_count').default(0),
    isHot: boolean('is_hot').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Junction table for Furniture Items and Tags
 */
export const photoTags = pgTable('photo_tags', {
    photoId: uuid('photo_id').references(() => furnitureItems.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.photoId, t.tagId] }),
}));

/**
 * Secrets / Settings Table
 */
export const secrets = pgTable('secrets', {
    key: text('key').primaryKey(),
    value: text('value'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * System Logs Table
 */
export const systemLogs = pgTable('system_logs', {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(), // Match bigint identity in DB
    level: text('level'), 
    operation: text('operation'),
    message: text('message'),
    resource: text('resource'),
    traceId: text('trace_id'),
    metadata: jsonb('metadata'),
    errorMessage: text('error_message'),
    stackTrace: text('stack_trace'),
    componentStack: text('component_stack'),
    url: text('url'),
    userId: uuid('user_id'),
    stack: text('stack'),
    context: text('context'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Tasks Table (Queue Management)
 */
export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    label: text('label').notNull(),
    type: text('type').notNull(),
    status: text('status').notNull(),
    meta: jsonb('meta'),
    data: jsonb('data'),
    userId: uuid('user_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    index('idx_tasks_status').on(t.status),
    index('idx_tasks_created_at').on(t.createdAt),
    index('idx_tasks_user_id').on(t.userId),
]);

/**
 * Maintenance Jobs Table
 */
export const maintenanceJobs = pgTable('maintenance_jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    status: text('status').default('pending'),
    operation: text('operation'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Settings Table (Legacy/Global Config)
 */
export const settings = pgTable('settings', {
    id: integer('id').primaryKey(),
    logoUrl: text('logo_url'),
    whatsapp1: text('whatsapp_1'),
    whatsapp2: text('whatsapp_2'),
    whatsapp1Name: text('whatsapp_1_name'),
    whatsapp2Name: text('whatsapp_2_name'),
    accessPasscode: text('access_passcode'),
    passcodeEnabled: boolean('passcode_enabled'),
    hotTagThreshold: integer('hot_tag_threshold'),
    hotTagsCount: integer('hot_tags_count'),
    openrouterModel: text('openrouter_model'),
    agnesModel: text('agnes_model'),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
});

/**
 * AI Audit Logs Table
 */
export const aiAuditLogs = pgTable('ai_audit_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    photoId: uuid('photo_id').references(() => furnitureItems.id),
    model: text('model'),
    promptVersion: text('prompt_version'),
    cleanedOutput: jsonb('cleaned_output'),
    rawOutput: jsonb('raw_output'),
    latencyMs: integer('latency_ms'),
    costEst: text('cost_est'),
    tokenUsage: jsonb('token_usage'),
    status: text('status'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    photoIdIdx: index('ai_audit_logs_photo_id_idx').on(table.photoId),
    createdAtIdx: index('ai_audit_logs_created_at_idx').on(table.createdAt),
}));

/**
 * Group Correction Logs Table
 */
export const groupCorrectionLogs = pgTable('group_correction_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    operation: text('operation'),
    inputPhotoIds: jsonb('input_photo_ids'),
    createdGroups: jsonb('created_groups'),
    userId: text('user_id'),
    createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Users Table (Metadata for references)
 */
export const users = pgTable('users', {
    id: text('id').primaryKey(),
    email: text('email'),
    createdAt: timestamp('created_at').defaultNow(),
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
