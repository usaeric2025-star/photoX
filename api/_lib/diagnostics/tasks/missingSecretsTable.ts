import { DiagnosticTask, DiagnosticIssue, DiagnosticContext } from "../types.js";
import { db, secrets } from "../../db/index.js";

export const missingSecretsTableTask: DiagnosticTask = {
  id: 'missing_secrets_table',
  deps: [],
  run: async (ctx: DiagnosticContext): Promise<DiagnosticIssue | null> => {
    try {
      await db.select().from(secrets).limit(1);
    } catch (e: any) {
      if (e.code === '42P01' || e.message?.includes('does not exist')) {
        return {
          id: 'missing_secrets_table',
          category: 'integrity',
          severity: 'P0',
          title: '缺失 secrets 數據表',
          description: '系統需要 secrets 表來安全儲存 API 金鑰及 AI 模型配置。目前該表不存在。',
          autoFixable: true,
          affectedCount: 1,
          sampleIds: []
        };
      }
    }
    return null;
  }
};
