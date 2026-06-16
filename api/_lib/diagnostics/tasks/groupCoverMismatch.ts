import { DiagnosticIssue, DiagnosticTask, DiagnosticContext } from "../types";

export const groupCoverMismatchTask: DiagnosticTask = {
  id: 'group_cover_mismatch',
  deps: ['photos', 'groups'],
  run: async (ctx: DiagnosticContext) => {
    const inconsistentCovers = ctx.groups?.filter((g: any) => {
      const gPhotos = ctx.photos.filter((p: any) => String(p.group_id) === String(g.id));
      if (gPhotos.length === 0) return false;
      const validCover = gPhotos.some((p: any) => p.id === g.cover_photo_id);
      const markedCover = gPhotos.some((p: any) => p.is_group_cover === true);
      return !g.cover_photo_id || !validCover || !markedCover;
    }) || [];
    
    if (inconsistentCovers.length === 0) return null;

    return {
      id: 'group_cover_mismatch',
      category: 'integrity',
      severity: 'P1',
      title: '合组封面不一致',
      description: '有合组设定了无效、缺失的封面图片，或者合组内的封面标志不正确。修复将自动选定合组内的第一张照片作为封面并同步更新。',
      affectedCount: inconsistentCovers.length,
      sampleIds: inconsistentCovers.slice(0, 5).map((g: any) => String(g.id)),
      autoFixable: true
    };
  }
};
