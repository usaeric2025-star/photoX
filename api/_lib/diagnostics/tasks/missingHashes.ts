import { DiagnosticTask, DiagnosticIssue, DiagnosticContext } from "../types";

export const missingHashesTask: DiagnosticTask = {
  id: 'missing_hashes',
  deps: ['photos'],
  run: async (ctx: DiagnosticContext): Promise<DiagnosticIssue | null> => {
    const missingHashes = ctx.photos.filter((p: any) => p.image_url && (!p.image_hash || p.image_hash.trim() === ''));
    if (missingHashes.length === 0) return null;
    
    return { 
      id: 'missing_hashes', 
      category: 'integrity', 
      severity: 'P1', 
      title: '缺少哈希的记录', 
      description: '这些照片有图片链接但没有哈希值，可能导致排重失效。您可以尝试自动修复（重新计算）或直接删除这些记录。', 
      affectedCount: missingHashes.length, 
      sampleIds: missingHashes.slice(0, 5).map((p: any) => p.id), 
      autoFixable: true 
    };
  }
};
