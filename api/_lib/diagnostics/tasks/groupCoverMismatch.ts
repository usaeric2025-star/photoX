import { DiagnosticIssue, DiagnosticTask, DiagnosticContext } from "../types.js";

export const groupCoverMismatchTask: DiagnosticTask = {
  id: 'group_cover_mismatch',
  deps: ['photos', 'groups'],
  run: async (ctx: DiagnosticContext) => {
    const inconsistentCovers = ctx.groups?.filter((g: Record<string, unknown>) => {
      const gPhotos = ctx.photos.filter((p: Record<string, unknown>) => String(p.group_id) === String(g.id));
      if (gPhotos.length === 0) return false;
      const coverPhotoInGroup = gPhotos.find((p: Record<string, unknown>) => p.id === g.cover_photo_id);
      if (!coverPhotoInGroup) return true;
      const markedCovers = gPhotos.filter((p: Record<string, unknown>) => p.is_group_cover === true);
      if (markedCovers.length !== 1) return true;
      if (markedCovers[0].id !== g.cover_photo_id) return true;
      return false;
    }) || [];
    
    if (inconsistentCovers.length === 0) return null;

    return {
      id: 'group_cover_mismatch',
      category: 'integrity',
      severity: 'P1',
      title: '合组封面不一致',
      description: '有合组设定了无效、缺失的封面图片，或者合组内的封面标志不正确。修复将自动选定合组内的第一张照片作为封面并同步更新。',
      affectedCount: inconsistentCovers.length,
      sampleIds: inconsistentCovers.slice(0, 5).map((g: Record<string, unknown>) => String(g.id)),
      autoFixable: true
    };
  }
};
