import { useCategoryList, useTagList, useManufacturerList } from '@/hooks';
import { Category, Tag, Manufacturer } from '@/types';

export function useStaticData() {
  const { data: categories = [] } = useCategoryList();
  const { data: tags = [] } = useTagList();
  const { data: manufacturers = [] } = useManufacturerList();

  const categoryMap = new Map<string, Category>(categories.map(c => [String(c.id), c]));
  const tagMap = new Map<string, Tag>(tags.map(t => [String(t.id), t]));
  const manufacturerMap = new Map<string, Manufacturer>(manufacturers.map(m => [String(m.id), m]));

  return { categoryMap, tagMap, manufacturerMap };
}
