import { Photo } from '../../types';
import { sortGroupPhotos, smartCompare } from './photoSorting';

export function groupPhotos(
  photos: Photo[], 
  showGroupsCollapsed: boolean, 
  sortOrder: 'newest' | 'oldest' | 'name' = 'newest', 
  globalPhotos?: Photo[], 
  isAdminMode: boolean = false
): Photo[] {
  if (photos.length === 0) return [];

  const groups = new Map<string, Photo[]>();
  const groupMaxTime = new Map<string, number>();

  photos.forEach(p => {
    if (p.group_id) {
      if (!groups.has(p.group_id)) groups.set(p.group_id, []);
      groups.get(p.group_id)!.push(p);

      const time = (p as any)._time || 0;
      const maxT = groupMaxTime.get(p.group_id) || 0;
      groupMaxTime.set(p.group_id, Math.max(maxT, time));
    }
  });

  // Calculate global group counts if globalPhotos is provided
  const globalGroupCounts = new Map<string, number>();
  if (globalPhotos && globalPhotos.length > 0) {
    globalPhotos.forEach(p => {
      if (p.group_id) {
        globalGroupCounts.set(p.group_id, (globalGroupCounts.get(p.group_id) || 0) + 1);
      }
    });
  }

  const representatives: Photo[] = [];
  const groupsSeen = new Set<string>();

  photos.forEach(p => {
    if (!p.group_id) {
      // For ungroupped items, just use their pre-calculated time
      representatives.push(p);
    } else if (!groupsSeen.has(p.group_id)) {
      groupsSeen.add(p.group_id);
      const groupList = groups.get(p.group_id) || [];
      const sorted = sortGroupPhotos(groupList);
      
      if (showGroupsCollapsed) {
        const trueMemberCount = (globalGroupCounts.has(p.group_id) 
          ? globalGroupCounts.get(p.group_id)! 
          : (sorted[0].group?.member_count || groupList.length));
          
        const cover = {
           ...sorted[0],
           group: sorted[0].group ? {
             ...sorted[0].group,
             member_count: trueMemberCount
           } : {
             id: p.group_id,
             name: { zh: 'Group' },
             color: null,
             cover_photo_id: null,
             member_count: trueMemberCount
           }
        };
        (cover as any)._time = groupMaxTime.get(p.group_id)!;
        (cover as any)._groupCoverName = typeof sorted[0].name === 'object' ? (sorted[0].name.zh || '') : (sorted[0].name || '');
        representatives.push(cover as any);
      } else {
        // Flat expansion but bind them under the same time and name logic so they stay together
        const coverNameZh = typeof sorted[0].name === 'object' ? (sorted[0].name.zh || '') : (sorted[0].name || '');
        sorted.forEach(member => {
           const time = groupMaxTime.get(member.group_id as string)!;
           const m = { ...member, _time: time, _groupCoverName: coverNameZh }; 
           representatives.push(m);
        });
      }
    }
  });
  
  representatives.sort((a: any, b: any) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    if (!isAdminMode) {
      if (a.is_hidden && !b.is_hidden) return 1;
      if (!a.is_hidden && b.is_hidden) return -1;
    }

    // 1. Are they exactly in the same group?
    if (a.group_id && b.group_id && a.group_id === b.group_id) {
       // Custom sort to match sortGroupPhotos inside library
       if (a.is_group_cover && !b.is_group_cover) return -1;
       if (!a.is_group_cover && b.is_group_cover) return 1;
       
       const aOrder = a.group_order ?? a.group_order;
       const bOrder = b.group_order ?? b.group_order;

       if (aOrder !== undefined && bOrder !== undefined) {
         if (aOrder !== bOrder) return aOrder - bOrder;
       } else if (aOrder !== undefined) return -1;
       else if (bOrder !== undefined) return 1;

       return (a.item_code || '').localeCompare(b.item_code || '');
    }

    // 2. Different groups (or ungrouped vs grouped, etc)
    let cmp = 0;
    if (sortOrder === 'name') {
      const nameA = a._groupCoverName ?? (typeof a.name === 'object' ? (a.name.zh || '') : (a.name || ''));
      const nameB = b._groupCoverName ?? (typeof b.name === 'object' ? (b.name.zh || '') : (b.name || ''));
      cmp = smartCompare(nameA, nameB);
    } else {
      cmp = sortOrder === 'oldest' ? a._time! - b._time! : b._time! - a._time!;
    }

    if (cmp !== 0) return cmp;

    // 3. Tie-breaker to ensure different groups/ungrouped items with exact same time/name don't interleave
    const gA = a.group_id || a.id;
    const gB = b.group_id || b.id;
    return gA.localeCompare(gB);
  });
  
  return representatives;
}
