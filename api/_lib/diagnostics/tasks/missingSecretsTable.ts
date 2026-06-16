import { DiagnosticTask, DiagnosticIssue, DiagnosticContext } from "../types.js";

export const missingSecretsTableTask: DiagnosticTask = {
  id: 'missing_secrets_table',
  deps: [],
  run: async (ctx: DiagnosticContext): Promise<DiagnosticIssue | null> => {
    try {
      // 嘗試查詢 secrets 表，如果報錯 code 為 42P01 或包含 does not exist，則說明表缺失
      const { error } = await ctx.supabase.from("secrets").select("key").limit(1);
      
      if (error && (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist'))) {
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
    } catch (e) {
      // 忽略錯誤
    }
    
    return null;
  }
};
