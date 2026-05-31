import { describe, it, expect } from 'vitest';
import { flattenPhotoInfiniteQueryPages, normalizeAdminPhotos } from '../photos';

describe('Photo Normalization Consistency', () => {
  const samplePhotos = [
    { id: '1', name: 'A', group: { member_count: 5 } },
    { id: '2', name: 'B', group: { member_count: 10 } }
  ];

  it('normalizeAdminPhotos should produce same structure as flattenPhotoInfiniteQueryPages', () => {
    const adminResult = normalizeAdminPhotos(samplePhotos as any);
    const publicResult = flattenPhotoInfiniteQueryPages([{ photos: samplePhotos }] as any);
    
    expect(adminResult).toEqual(publicResult);
  });

  it('normalizeAdminPhotos should handle duplicates by taking max member_count', () => {
    const photos = [
      { id: '1', name: 'A', group: { member_count: 5 } },
      { id: '1', name: 'A (updated)', group: { member_count: 8 } }
    ];
    const result = normalizeAdminPhotos(photos as any);
    expect(result).toHaveLength(1);
    expect(result[0].group?.member_count).toBe(8);
  });
});

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
