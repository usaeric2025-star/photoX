import * as v from 'valibot';

/**
 * Common API Schemas
 */

export const ManufacturerSchema = v.object({
  id: v.number(),
  name: v.string(),
  aliases: v.optional(v.array(v.string())),
});

export const GroupSchema = v.object({
  id: v.string(),
  name: v.string(),
  description: v.nullable(v.optional(v.string())),
  cover_photo_id: v.nullable(v.optional(v.string())),
  is_hidden: v.optional(v.boolean()),
  user_id: v.string(),
  created_at: v.string(),
  updated_at: v.string(),
  status: v.optional(v.union([v.literal('draft'), v.literal('confirmed'), v.literal('rejected')])),
  metadata: v.optional(v.record(v.string(), v.unknown())),
});

