import { DiagnosticIssue, DiagnosticTask, DiagnosticContext } from "../types";

export const emptyGroupsTask: DiagnosticTask = {
  id: 'empty_groups',
  deps: ['photos', 'groups'],
  run: async (ctx: DiagnosticContext) => {
    const photosByGroup = new Map<string, number>();
    ctx.photos.forEach((p) => { 
        const photo = p as Record<string, unknown>;
        if (photo.group_id) { 
            const gid = String(photo.group_id); 
            photosByGroup.set(gid, (photosByGroup.get(gid) || 0) + 1); 
        } 
    });
    const emptyGroups = ctx.groups?.filter((g) => !photosByGroup.has(String((g as Record<string, unknown>).id))) || [];
    
    if (emptyGroups.length === 0) return null;
    
    return { 
      id: 'empty_groups', 
      category: 'integrity', 
      severity: 'P0', 
      title: '空合组', 
      description: '有些合组中没有任何照片', 
      affectedCount: emptyGroups.length, 
      sampleIds: emptyGroups.slice(0, 5).map((g) => String((g as Record<string, unknown>).id)), 
      autoFixable: true 
    };
  }
};
