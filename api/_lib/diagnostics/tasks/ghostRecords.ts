import { DiagnosticIssue, DiagnosticTask, DiagnosticContext } from "../types";

export const ghostRecordsTask: DiagnosticTask = {
  id: 'ghost_records',
  deps: ['photos'],
  run: async (ctx: DiagnosticContext) => {
    const completeGhosts = ctx.photos.filter((p: any) => (!p.image_url || p.image_url === '') && (!p.image_hash || p.image_hash === ''));
    
    if (completeGhosts.length === 0) return null;
    
    return { 
      id: 'ghost_records', 
      category: 'integrity', 
      severity: 'P0', 
      title: '完全幽灵记录', 
      description: '数据库中有记录但完全没有图片链接和哈希，属于无用垃圾数据', 
      affectedCount: completeGhosts.length, 
      sampleIds: completeGhosts.slice(0, 5).map((p: any) => p.id), 
      autoFixable: true 
    };
  }
};
