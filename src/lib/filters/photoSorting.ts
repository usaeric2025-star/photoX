import { Photo } from '../../types';

export function smartCompare(a: string, b: string): number {
  const numA = Number(a);
  const numB = Number(b);
  // Check if both are valid numbers and not empty strings or just whitespace
  if (!isNaN(numA) && !isNaN(numB) && a.trim() !== '' && b.trim() !== '' && a === String(numA) && b === String(numB)) {
    return numA - numB;
  }
  return a.localeCompare(b);
}

export function sortGroupPhotos(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => {
    if (a.is_group_cover && !b.is_group_cover) return -1;
    if (!a.is_group_cover && b.is_group_cover) return 1;
    
    const aOrder = a.group_order ?? (a as any).group_order;
    const bOrder = b.group_order ?? (b as any).group_order;

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;

    return smartCompare(a.item_code || '', b.item_code || '');
  });
}
