import { DiagnosticTask, DiagnosticIssue } from "../types.js";

export const duplicatePhotosTask: DiagnosticTask = {
  id: "duplicate-photos",
  deps: ["photos"],
  run: async ({ photos }) => {
    const groups: Record<string, typeof photos> = {};
    
    photos.forEach(p => {
      if (!p.image_hash) return;
      const key = `${p.user_id}_${p.image_hash}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    const duplicates = Object.entries(groups)
      .filter(([_, group]) => group.length > 1)
      .map(([key, group]) => ({
        key,
        count: group.length,
        items: group.map(p => ({ id: p.id, name: p.name, created_at: p.created_at }))
      }));

    if (duplicates.length === 0) return null;

    const allAffectedIds = duplicates.flatMap(d => d.items.map(i => i.id));

    return {
      id: "duplicate-photos",
      category: "integrity",
      severity: "P2",
      title: "检测到重复照片",
      description: `发现 ${duplicates.length} 组重复照片（共 ${allAffectedIds.length} 条记录）。系统可自动保留最旧的一份并清理其他冗余记录。`,
      affectedCount: allAffectedIds.length,
      sampleIds: allAffectedIds.slice(0, 5),
      autoFixable: true
    };
  }
};
