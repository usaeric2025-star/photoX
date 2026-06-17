export * from './queries';
export * from './commands';
export * from './mappers';
export * from '@/features/upload/services/upload';
export * from './maintenance';
export * from './groupUtils';

import { getPhotos } from './queries/list';
import { getPhotoById } from './queries/detail';
import { updatePhoto } from './commands/update';
import { getPhotosByGroupPaginated } from './queries/byGroup';

export const loadAllPhotosFromCloud = getPhotos;
export const loadPhotoById = getPhotoById;
export const update = updatePhoto;
export const loadPhotosByGroupIdPaginated = getPhotosByGroupPaginated;
