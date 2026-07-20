import { parseAsString, parseAsJson, parseAsBoolean, parseAsInteger } from 'nuqs';
import * as v from 'valibot';
import { parseWithValibot } from '#lib/valibot/adapters/nuqs.js';
import { SortSchema } from '#lib/valibot/schemas/filters.js';
import { PageSchema, LimitSchema } from '#lib/valibot/schemas/pagination.js';

// Photo ID Parser
export const parseAsPhotoId = parseWithValibot(v.string()).withDefault('');

// Search Query Parser
export const searchParser = parseAsString.withDefault('');

// Category Parser
export const categoryParser = parseAsString.withDefault('');

// Generic Array Parser (for URL compression via JSON)
export function parseAsArray<T = string>(defaultValue: T[] = []) {
  return parseAsJson<T[]>((value) => {
    if (!Array.isArray(value)) return defaultValue;
    // 精準定位：過濾掉非字符串（如果是 ID 數組）或空值，防止報錯
    return value.filter(v => typeof v === 'string' && v.trim() !== '') as T[];
  }).withDefault(defaultValue);
}

// Tags Parser (Array of strings)
export const tagsParser = parseAsArray<string>([]);

// Categories Parser (Array of strings)
export const categoriesParser = parseAsArray<string>([]);

// Groups Parser (Array of strings)
export const groupsParser = parseAsArray<string>([]);

// Selected IDs Parser
export const selectedIdsParser = parseAsArray<string>([]);

// Sort Parser (使用 Valibot)
export const sortParser = parseWithValibot(SortSchema).withDefault('newest');

// Status Parser
const statusParser = parseAsString.withDefault('all');

// Batch Parser
export const batchParser = parseAsBoolean.withDefault(false);

// Modal Parser
export const modalParser = parseAsString.withDefault('none');

// Page Parser (使用 Valibot)
const pageParser = parseWithValibot(PageSchema).withDefault(1);

// Limit Parser (使用 Valibot)
const limitParser = parseWithValibot(LimitSchema).withDefault(20);

// Group ID Parser
export const groupIdParser = parseAsString.withDefault('');

// View Parser (grid | list)
const viewParser = parseAsString.withDefault('grid');

// Anchor Parser (for scrolling to photo)
export const anchorParser = parseAsBoolean.withDefault(false);

// Show Groups Collapsed Parser
export const showGroupsCollapsedParser = parseAsBoolean.withDefault(true);

// Columns Parser
const columnsParser = parseAsInteger.withDefault(3);
