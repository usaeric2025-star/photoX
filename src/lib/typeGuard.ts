import { Photo } from '../types';

export function isValidPhoto(photo: unknown): photo is Photo {
  const p = photo as any;
  return (
    p &&
    typeof p.id === 'string' &&
    (typeof p.name === 'string' || p.name === null || p.name === undefined) &&
    (Array.isArray(p.tagIds) || p.tagIds == null) &&
    (Array.isArray(p.dimensions) || p.dimensions == null)
  );
}
