import { describe, it, expect } from 'vitest';
import { flattenPhotoInfiniteQueryPages } from '../../../lib/selectors/photos';

describe('UnifiedGallery Data Normalization', () => {
  it('should normalize admin photos correctly (no duplicates, aggregate counts)', () => {
    const rawAdminPhotos = [
        { id: '1', name: 'A', member_count: 5 }, 
        { id: '2', name: 'B', member_count: 1 }, 
        { id: '2', name: 'B', member_count: 10 }, 
        { id: '', name: 'C' }
    ];
    // Argument to flattenPhotoInfiniteQueryPages must be { photos: Photo[] }[]
    const normalized = flattenPhotoInfiniteQueryPages([{ photos: rawAdminPhotos as any }]);
    expect(normalized).toHaveLength(2);
    expect(normalized.find(p => p.id === '1')?.member_count).toEqual(5);
    expect(normalized.find(p => p.id === '2')?.member_count).toEqual(10);
  });
});
