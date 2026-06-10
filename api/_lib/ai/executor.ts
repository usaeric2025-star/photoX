import { normalizeI18n } from "../../_shared/i18n.js";
import { logger } from "../logger.js";
import { extractJSON } from "./utils.js";

interface AITaskOptions {
  task: string;
  provider: any;
  model: string;
  prompt: string;
  messages: any[];
  metadata?: any;
  shouldNormalize?: boolean;
}

/**
 * 核心 AI 執行管道
 * 封裝：測速 + 審計日誌 + JSON 解析 + I18n 歸一化
 */
export async function executeAITask(options: AITaskOptions) {
  const { task, provider, model, messages, prompt, metadata, shouldNormalize = true } = options;
  const maxRetries = 3;
  let lastError: any = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const startTime = Date.now();
      const result = await provider.chat(messages);
      const endTime = Date.now();

      // 1. 自動審計日誌 (不阻塞主流程)
      let auditedResponse = result.text || result.error;
      if (result.success && auditedResponse?.startsWith('{')) {
        try {
            const raw = JSON.parse(auditedResponse);
            const ALLOWED = ['name', 'description', 'tags', 'category', 'tagNames', 'category_id'];
            const trimmed = Object.fromEntries(
                Object.entries(raw).filter(([key]) => ALLOWED.includes(key))
            );
            auditedResponse = JSON.stringify(trimmed);
        } catch {}
      }

      logger.info(`AI Task: ${task}`, {
        model,
        provider: provider.name,
        prompt,
        response: auditedResponse,
        latency_ms: endTime - startTime,
        token_usage: result.usage,
        status: result.success ? 'success' : 'error',
        error_message: result.error,
        request_metadata: metadata
      });

      if (!result.success) {
        throw new Error(result.error || 'AI 調用失敗');
      }

      // 2. 解析 JSON
      let data;
      try {
        data = extractJSON(result.text || '{}');
      } catch (parseError: any) {
         // Enhance: Try repair JSON? extractJSON already does some, but if still failed we can throw to trigger retry
         throw new Error('Parse failed: ' + parseError.message);
      }

      if (!data) {
         throw new Error('Parse failed: returned empty data');
      }

      // 3. 多語言格式強制歸一化
      if (shouldNormalize && data) {
        if (data.name) data.name = normalizeI18n(data.name);
        if (data.description) data.description = normalizeI18n(data.description);
      }

      // 4. 保存原始識別源代碼與解析數據到 system_logs 數據表中 (非阻塞)
      if (metadata?.photoId) {
        const photoId = metadata.photoId;
        const rawResultStr = result.text || auditedResponse;
        const parsedDataObj = data;
        import("../supabase.js").then(async ({ getSupabaseAdmin }) => {
            try {
                const supabase = await getSupabaseAdmin();
                const { error } = await supabase.from('system_logs').insert({
                    error_message: `AI analysis completed for photo ${photoId}`,
                    context: 'AI_Executor',
                    user_id: metadata?.userId || null,
                    metadata: {
                        action: 'analyze_photo',
                        level: 'info',
                        photo_id: photoId,
                        raw_result: rawResultStr,
                        parsed_data: parsedDataObj
                    },
                    created_at: new Date().toISOString()
                });
                if (error) {
                    console.warn(`[system_logs-save-failed] ${error.message}`);
                } else {
                    console.log(`[system_logs-save-success] Saved raw output for photo ID: ${photoId}`);
                }
            } catch (err: any) {
                console.warn(`[system_logs-save-exception] ${err.message}`);
            }
        }).catch(err => console.warn(`[system_logs-import-failed]`, err.message));
      }

      return data;
      
    } catch (error: any) {
      lastError = error;
      
      if (i < maxRetries) {
        // 等待後重試 (指數退避 1s, 2s, 4s)
        const backoffMs = Math.pow(2, i) * 1000;
        console.warn(`[executeAITask] Failed, retrying in ${backoffMs}ms... (Attempt ${i + 1}/${maxRetries}):`, error.message);
        await new Promise(res => setTimeout(res, backoffMs));
      }
    }
  }

  // 5. 最後一次失敗：記錄日誌 + 返回降級值 (不中斷流程)
  console.error(`[executeAITask] Max retries reached for task ${task}. Last error:`, lastError);
  
  // Return fallback data matching expected schema
  return {
     _fallback: true,
     _error: lastError?.message || 'Unknown error'
  };
}
