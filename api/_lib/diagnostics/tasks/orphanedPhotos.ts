import { DiagnosticIssue, DiagnosticTask, DiagnosticContext } from "../types";

export const orphanedPhotosTask: DiagnosticTask = {
  id: 'orphaned_photos',
  deps: ['photos', 'groups'],
  run: async (ctx: DiagnosticContext) => {
    const groupIds = new Set(ctx.groups?.map((g) => String(g.id)) || []);
    const orphanedPhotos = ctx.photos.filter((p) => p.group_id && !groupIds.has(String(p.group_id)));
    
    if (orphanedPhotos.length === 0) return null;

    return { 
      id: 'orphaned_photos', 
      category: 'integrity', 
      severity: 'P0', 
      title: '孤儿照片', 
      description: '照片指向了不存在的合组', 
      affectedCount: orphanedPhotos.length, 
      sampleIds: orphanedPhotos.slice(0, 5).map((p) => p.id), 
      autoFixable: false 
    };
  }
};
