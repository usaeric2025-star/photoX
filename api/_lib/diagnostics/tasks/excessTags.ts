import { DiagnosticIssue, DiagnosticTask, DiagnosticContext } from "../types.js";

export const excessTagsTask: DiagnosticTask = {
  id: 'excessive_tags',
  deps: ['photoTags'],
  run: async (ctx: DiagnosticContext) => {
    const photoTagCounts = new Map<string, string[]>();
    ctx.photoTags?.forEach((pt: Record<string, unknown>) => {
      if (pt.photo_id) {
        const pid = String(pt.photo_id);
        if (!photoTagCounts.has(pid)) {
          photoTagCounts.set(pid, []);
        }
        photoTagCounts.get(pid)!.push(String(pt.tag_id));
      }
    });

    const excessTagPhotoIds: string[] = [];
    photoTagCounts.forEach((tagIds, pid) => {
      if (tagIds.length > 3) {
        excessTagPhotoIds.push(pid);
      }
    });

    if (excessTagPhotoIds.length === 0) return null;

    return {
      id: 'excessive_tags',
      category: 'integrity',
      severity: 'P1',
      title: '照片标签超出限制（多于 3 个）',
      description: `检测到有 ${excessTagPhotoIds.length} 张照片关联了多于 3 个标签。点击修复将自动只保留前 3 个标签，其余多出的标签将被移除。`,
      affectedCount: excessTagPhotoIds.length,
      sampleIds: excessTagPhotoIds.slice(0, 5),
      autoFixable: true
    };
  },
  repair: async (ctx: DiagnosticContext) => {   
      // Implement later
      return { success: false, message: 'Not implemented' };
  }
};
