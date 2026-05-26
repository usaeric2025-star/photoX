import { describe, it, expect } from 'vitest';
import { flattenPhotoInfiniteQueryPages } from '../../../lib/selectors/photos';

describe('UnifiedGallery Data Normalization', () => {
  it('should normalize admin photos correctly (no duplicates, no empty ids)', () => {
    const rawAdminPhotos = [
        { id: '1', name: 'A' }, 
        { id: '2', name: 'B' }, 
        { id: '2', name: 'B' }, 
        { id: '', name: 'C' }
    ];
    // Argument to flattenPhotoInfiniteQueryPages must be { photos: Photo[] }[]
    const normalized = flattenPhotoInfiniteQueryPages([{ photos: rawAdminPhotos as any }]);
    expect(normalized).toHaveLength(2);
    expect(normalized.map(p => p.id)).toEqual(['1', '2']);
  });
});
