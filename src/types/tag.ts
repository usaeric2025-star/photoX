import { type } from 'arktype';

export const TagSchema = type({
  'id?': 'number | string',
  'name': 'string',
  'aliases?': 'string[]',
  'user_id?': 'string',
  'is_pinned?': 'boolean',
  'hot_score?': 'number',
  'is_global?': 'boolean',
});
