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

// Tags Parser (Array of strings)
export const tagsParser = parseAsJson<string[]>((value) => 
  (Array.isArray(value) && value.every(v => typeof v === 'string')) ? value : []
).withDefault([]);

// Selected IDs Parser
export const selectedIdsParser = parseAsJson<string[]>((value) => 
  (Array.isArray(value) && value.every(v => typeof v === 'string')) ? value : []
).withDefault([]);

// Sort Parser (使用 Valibot)
export const sortParser = parseWithValibot(SortSchema).withDefault('newest');

// Status Parser
export const statusParser = parseAsString.withDefault('all');

// Batch Parser
export const batchParser = parseAsBoolean.withDefault(false);

// Modal Parser
export const modalParser = parseAsString.withDefault('none');

// Page Parser (使用 Valibot)
export const pageParser = parseWithValibot(PageSchema).withDefault(1);

// Limit Parser (使用 Valibot)
export const limitParser = parseWithValibot(LimitSchema).withDefault(20);

// Group ID Parser
export const groupIdParser = parseAsString.withDefault('');

// View Parser (grid | list)
export const viewParser = parseAsString.withDefault('grid');

// Anchor Parser (for scrolling to photo)
export const anchorParser = parseAsBoolean.withDefault(false);

// Show Groups Collapsed Parser
export const showGroupsCollapsedParser = parseAsBoolean.withDefault(true);

// Columns Parser
export const columnsParser = parseAsInteger.withDefault(3);
