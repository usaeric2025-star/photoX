import { type } from 'arktype';

export const PhotoListItemSchema = type({
  id: 'string',
  name: 'string',
  description: 'string | null',
  imageUrl: 'string',
  thumbnailUrl: 'string',
  groupId: 'string | null',
  groupName: 'string | null',
  memberCount: 'number',
  tags: 'string[]',
  'isPinned?': 'boolean',
  'isHidden?': 'boolean',
  'isCover?': 'boolean',
});

export type PhotoListItem = typeof PhotoListItemSchema.infer;
