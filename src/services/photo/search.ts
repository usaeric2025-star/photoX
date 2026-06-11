import { logger } from '@/lib/logger';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';
import { normalizeSearchQuery } from '@/lib/utils';
import type { AppType } from '../../../api/app'; // Fails if not accessible, but following rules

export async function findPhotoIdsBySearch(q: string): Promise<{ catIds: number[], photoIdsFromTags: string[], q: string } | null> {
  const normSearchQuery = normalizeSearchQuery(q);
  if (!normSearchQuery) return null;

  try {
    const res = await api.search.ids.$get({ query: { q: normSearchQuery } });
    
    if (!res.ok) {
      throw ErrorFactory.wrap(new Error('Search failed'), 'search');
    }

    const { data } = await res.json();
    return {
      catIds: data.catIds,
      photoIdsFromTags: data.photoIds,
      q: normSearchQuery
    };
  } catch (e) {
    logger.error('Search service error:', e);
    return null;
  }
}

export function buildSearchFilter(catIds: number[], photoIdsFromTags: string[], q: string) {
  let orSegments = [
    `name->>zh.ilike."%${q}%"`,
    `name->>en.ilike."%${q}%"`,
    `name->>ms.ilike."%${q}%"`,
    `description->>zh.ilike."%${q}%"`,
    `description->>en.ilike."%${q}%"`,
    `description->>ms.ilike."%${q}%"`,
    `manual_code.ilike."%${q}%"`,
    `model_number.ilike."%${q}%"`,
    `item_code.ilike."%${q}%"`
  ];

  if (catIds.length > 0) {
    orSegments.push(`category_id.in.(${catIds.join(',')})`);
  }

  if (photoIdsFromTags.length > 0) {
    const limited = photoIdsFromTags.slice(0, 800);
    orSegments.push(`id.in.("${limited.join('","')}")`);
  }

  return orSegments.join(',');
}
