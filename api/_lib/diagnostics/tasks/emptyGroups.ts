import { DiagnosticIssue, DiagnosticTask, DiagnosticContext } from "../types";

export const emptyGroupsTask: DiagnosticTask = {
  id: 'empty_groups',
  deps: ['photos', 'groups'],
  run: async (ctx: DiagnosticContext) => {
    const photosByGroup = new Map<string, number>();
    ctx.photos.forEach((p: any) => { if (p.group_id) { const gid = String(p.group_id); photosByGroup.set(gid, (photosByGroup.get(gid) || 0) + 1); } });
    const emptyGroups = ctx.groups?.filter((g: any) => !photosByGroup.has(String(g.id))) || [];
    
    if (emptyGroups.length === 0) return null;
    
    return { 
      id: 'empty_groups', 
      category: 'integrity', 
      severity: 'P0', 
      title: '空合组', 
      description: '有些合组中没有任何照片', 
      affectedCount: emptyGroups.length, 
      sampleIds: emptyGroups.slice(0, 5).map((g: any) => String(g.id)), 
      autoFixable: true 
    };
  }
};
