import { useMemo } from 'react';
import { useCategoryList, useTagList, useManufacturerList } from '@/hooks';
import { Category, Tag, Manufacturer } from '@/types';

export function useStaticData() {
  const { data: categories = [] } = useCategoryList();
  const { data: tags = [] } = useTagList();
  const { data: manufacturers = [] } = useManufacturerList();

  return useMemo(() => {
    const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]));
    const tagMap = new Map<string, Tag>(tags.map(t => [t.id, t]));
    const manufacturerMap = new Map<string, Manufacturer>(manufacturers.map(m => [m.id, m]));

    return { categoryMap, tagMap, manufacturerMap };
  }, [categories, tags, manufacturers]);
}
