import { parseAsString, parseAsInteger, parseAsJson, parseAsBoolean, createParser } from 'nuqs';
import * as v from 'valibot';

// Photo ID Parser
export const parseAsPhotoId = createParser({
  parse: (value: string | null) => {
    if (!value) return null;
    const schema = v.string();
    try {
      return v.parse(schema, value);
    } catch {
      return null;
    }
  },
  serialize: (value: string | null) => value ?? '',
});

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

// Sort Parser
export const sortParser = parseAsString.withDefault('newest');

// Status Parser
export const statusParser = parseAsString.withDefault('all');

// Batch Parser
export const batchParser = parseAsBoolean.withDefault(false);

// Modal Parser
export const modalParser = parseAsString.withDefault('');

// Page Parser
export const pageParser = parseAsInteger.withDefault(1);

// Group ID Parser
export const groupIdParser = parseAsString.withDefault('');

// View Parser (grid | list)
export const viewParser = parseAsString.withDefault('grid');

// Anchor Parser (for scrolling to photo)
export const anchorParser = parseAsBoolean.withDefault(false);

// Show Groups Collapsed Parser
export const showGroupsCollapsedParser = parseAsBoolean.withDefault(true);
