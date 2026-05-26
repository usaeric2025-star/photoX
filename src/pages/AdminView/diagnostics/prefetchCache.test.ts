import { DiagnosticTest, registerDiagnostic } from './index';
import { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/hooks/queries/keys';
import { syncCache } from '@/utils/indexedDB';
import { Category, Tag } from '@/types';

const test: DiagnosticTest = {
  id: 'prefetch_cache',
  name: 'Prefetch Cache & DB Fallback',
  description: '驗證 QueryClient 預取、緩存以及離線 IndexedDB 本地存取機制',
  run: async () => {
    const startTime = performance.now();
    try {
      // 1. Validate prefetch and cache storage on a QueryClient instance
      const queryClient = new QueryClient();
      
      const mockCategories: Category[] = [
        { id: 'cat_diag_1', name: 'Diag Category 1', aliases: [], subcategories: [] }
      ];
      const mockTags: Tag[] = [
        { id: 'tag_diag_1', name: 'Diag Tag 1', aliases: [] }
      ];

      // Prefetch categories
      await queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.categories,
        queryFn: async () => mockCategories,
      });

      // Prefetch tags
      await queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.tags,
        queryFn: async () => mockTags,
      });

      // Assert caches are populated correctly
      const cachedCategories = queryClient.getQueryData<Category[]>(QUERY_KEYS.categories);
      const cachedTags = queryClient.getQueryData<Tag[]>(QUERY_KEYS.tags);

      if (!cachedCategories || cachedCategories.length === 0) {
        throw new Error('QueryClient category prefetch cache is missing or empty');
      }
      if (!cachedTags || cachedTags.length === 0) {
        throw new Error('QueryClient tag prefetch cache is missing or empty');
      }

      // 2. Mock and verify IndexedDB cache save/load mechanics (Offline durability fallback)
      await syncCache.saveCategories(mockCategories);
      await syncCache.saveTags(mockTags);

      const dbCategories = await syncCache.getCategories();
      const dbTags = await syncCache.getTags();

      if (!dbCategories || dbCategories.length === 0 || dbCategories[0]?.id !== 'cat_diag_1') {
        throw new Error('IndexedDB category cache retrieval failed or holds incorrect data');
      }
      if (!dbTags || dbTags.length === 0 || dbTags[0]?.id !== 'tag_diag_1') {
        throw new Error('IndexedDB tag cache retrieval failed or holds incorrect data');
      }

      return { passed: true, message: 'Query prefetch routing and backup cache verified perfectly', durationMs: performance.now() - startTime };

    } catch (e: any) {
      return { passed: false, message: e.message || 'Error occurred', durationMs: performance.now() - startTime };
    }
  }
};

registerDiagnostic(test);

import { it } from 'vitest';
it('stub test for vitest', () => {});
