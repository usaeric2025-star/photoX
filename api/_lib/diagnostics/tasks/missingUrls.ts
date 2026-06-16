import { DiagnosticTask, DiagnosticIssue, DiagnosticContext } from "../types";

export const missingUrlsTask: DiagnosticTask = {
  id: 'missing_urls',
  deps: ['photos'],
  run: async (ctx: DiagnosticContext): Promise<DiagnosticIssue | null> => {
    const missingUrls = ctx.photos.filter((p: any) => p.image_hash && (!p.image_url || p.image_url === ''));
    if (missingUrls.length === 0) return null;
    
    return { 
      id: 'missing_urls', 
      category: 'integrity', 
      severity: 'P0', 
      title: '缺少链接的照片', 
      description: '这些记录有哈希但没有图片链接，无法正常显示。', 
      affectedCount: missingUrls.length, 
      sampleIds: missingUrls.slice(0, 5).map((p: any) => p.id), 
      autoFixable: true 
    };
  }
};
