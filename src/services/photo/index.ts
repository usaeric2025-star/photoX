export * from './commands';
export * from './mappers';
export * from '@/features/upload/services/upload';
export * from './groupUtils';

import { updatePhoto } from './commands/update';

export const update = updatePhoto;
