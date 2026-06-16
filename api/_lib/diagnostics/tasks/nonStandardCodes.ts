import { DiagnosticTask, DiagnosticIssue, DiagnosticContext } from "../types";

export const nonStandardCodesTask: DiagnosticTask = {
  id: 'non_standard_item_codes',
  deps: ['photos'],
  run: async (ctx: DiagnosticContext): Promise<DiagnosticIssue | null> => {
    const compliantRegex = /^X-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
    const nonStandardCodes = ctx.photos.filter((p: any) => p.item_code && !compliantRegex.test(p.item_code));
    if (nonStandardCodes.length === 0) return null;
    
    return {
      id: 'non_standard_item_codes',
      category: 'consistency',
      severity: 'P2',
      title: '系统编号格式不规范',
      description: `检测到有 ${nonStandardCodes.length} 条记录使用了旧格式（如 FUR-xxx）或非标准格式的系统编号。点击修复将统一收敛为 X-XXXXXXXX 格式。`,
      affectedCount: nonStandardCodes.length,
      sampleIds: nonStandardCodes.slice(0, 5).map((p: any) => p.id),
      autoFixable: true
    };
  }
};
