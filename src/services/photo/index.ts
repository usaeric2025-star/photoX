export * from './commands';
export * from '@/features/upload/services';
export * from './utils';

import { updatePhoto } from './commands';

export const update = updatePhoto;
