import { DiagnosticTest, registerDiagnostic } from './index';
import { interactionBus } from '@/lib/interactionBus';
import { flattenPhotoInfiniteQueryPages, normalizeAdminPhotos } from '@/lib/selectors/photos';
import { Photo } from '@/types';

const test: DiagnosticTest = {
  id: 'select_boundary',
  name: 'Selection Boundary & Bus',
  description: '驗證 interactionBus 訂閱、退訂機制，以及 selector 管道的去重和無效 ID 過濾功能',
  run: async () => {
    const startTime = performance.now();
    try {
      // 1. Verify interactionBus subscribe and unsubscribe
      let callCount = 0;
      const unsubscribe = interactionBus.subscribe((state) => {
        callCount++;
      });

      // Toggle item to trigger update
      interactionBus.toggleSelected('temp_diagnostic_id');
      if (callCount !== 1) {
        throw new Error(`Subscribe update failed. Expected call count 1, got ${callCount}`);
      }

      unsubscribe();

      // Trigger another adjust
      interactionBus.toggleSelected('temp_diagnostic_id'); // should not increment callCount
      if (callCount !== 1) {
        throw new Error(`Unsubscribe failed. Expected call count to remain 1, got ${callCount}`);
      }

      // Cleanup
      interactionBus.setSelectedIds(new Set());

      // 2. Verify selector pipelines can handle dirty data (invalid/duplicate/empty IDs)
      const dirtyPages = [
        {
          photos: [
            { id: '1', name: 'Photo 1', group: { member_count: 0 } } as Photo,
            { id: '', name: 'Photo Missing ID' } as any as Photo, // Invalid
            { id: '1', name: 'Photo 1 Duplicated', group: { member_count: 5 } } as Photo, // Duplicate
            { id: '5c9ef3bd84a44fef', name: 'Dirty Photo' } as Photo
          ]
        },
        {
          photos: [
            { id: '2', name: 'Photo 2' } as Photo,
            { id: '1', name: 'Photo 1 Another Duplication', group: { member_count: 2 } } as Photo // Duplicate across pages
          ]
        }
      ];

      const flatResult = flattenPhotoInfiniteQueryPages(dirtyPages);

      // Verify that the empty ID was removed, duplicates were removed/aggregated, and dirty id works
      const hasEmptyId = flatResult.some(p => !p.id);
      if (hasEmptyId) {
        throw new Error('Pipeline failed to discard photo missing an ID');
      }

      const id1Count = flatResult.filter(p => p.id === '1').length;
      if (id1Count !== 1) {
        throw new Error(`Duplication filter failed. Expected exactly 1 item with id "1", got ${id1Count}`);
      }

      const photo1 = flatResult.find(p => p.id === '1');
      if (photo1?.group?.member_count !== 5) {
        throw new Error(`Aggregator failed. Expected member_count to be max (5), got ${photo1?.group?.member_count}`);
      }

      const adminDirtyList = [
        { id: '1', name: 'Admin 1', group: { member_count: 0 } } as Photo,
        { id: '', name: 'Admin Invalid' } as any as Photo,
        { id: '1', name: 'Admin 1 Dup', group: { member_count: 10 } } as Photo
      ];

      const adminResult = normalizeAdminPhotos(adminDirtyList);
      if (adminResult.length !== 1 || adminResult[0]?.group?.member_count !== 10) {
        throw new Error('normalizeAdminPhotos pipeline logic failed validation');
      }

      return { passed: true, message: 'Selection boundary and pipeline verified successfully', durationMs: performance.now() - startTime };

    } catch (e: any) {
      return { passed: false, message: e.message || 'Error occurred', durationMs: performance.now() - startTime };
    }
  }
};

registerDiagnostic(test);

import { it } from 'vitest';
it('stub test for vitest', () => {});
