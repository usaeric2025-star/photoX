import { describe, it, expect } from 'vitest';
import { flattenPhotoInfiniteQueryPages } from '../photos';

describe('flattenPhotoInfiniteQueryPages', () => {
  it('should filter out missing IDs and remove duplicates', () => {
    const pages = [
      { photos: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] },
      { photos: [{ id: '2', name: 'B' }, { id: '', name: 'C' }] }
    ];
    const result = flattenPhotoInfiniteQueryPages(pages as any);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id)).toEqual(['1', '2']);
  });
});
