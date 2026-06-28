import { parseAsString, parseAsJson, parseAsBoolean, createParser } from 'nuqs';
import * as v from 'valibot';
import { parseWithValibot } from '@/lib/valibot/adapters/nuqs';
import { SortSchema } from '@/lib/valibot/schemas/filters';
import { PageSchema, LimitSchema } from '@/lib/valibot/schemas/pagination';

// Photo ID Parser
export const parseAsPhotoId = parseWithValibot(v.string());

// Search Query Parser
export const searchParser = parseAsString.withDefault('');

// Category Parser
export const categoryParser = parseAsString.withDefault('');

// Tags Parser (Array of strings)
export const tagsParser = parseAsJson<string[]>((value) => {
  try {
    const parsed = JSON.parse(value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}).withDefault([]);

// Selected IDs Parser
export const selectedIdsParser = parseAsJson<string[]>((value) => {
  try {
    const parsed = JSON.parse(value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}).withDefault([]);

// Sort Parser (使用 Valibot)
export const sortParser = parseWithValibot(SortSchema).withDefault('newest');

// Status Parser
export const statusParser = parseAsString.withDefault('all');

// Batch Parser
export const batchParser = parseAsBoolean.withDefault(false);

// Modal Parser
export const modalParser = parseAsString.withDefault('');

// Page Parser (使用 Valibot)
export const pageParser = parseWithValibot(PageSchema).withDefault(1);

// Group ID Parser
export const groupIdParser = parseAsString.withDefault('');

// View Parser (grid | list)
export const viewParser = parseAsString.withDefault('grid');

// Anchor Parser (for scrolling to photo)
export const anchorParser = parseAsBoolean.withDefault(false);

// Show Groups Collapsed Parser
export const showGroupsCollapsedParser = parseAsBoolean.withDefault(true);
