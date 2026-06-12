import { normalizeI18n } from "../../_shared/i18n.js";
import { logger } from "../logger.js";
import { extractJSON } from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseAdmin } from "../supabase.js";
import { uploadToR2, deleteFromR2 } from "../storage.js";

interface AITaskOptions {
  task: string;
  provider: any;
  model: string;
  prompt: string;
  messages: any[];
  metadata?: any;
  shouldNormalize?: boolean;
}

export interface AIAuditData {
  photoId?: string;
  model: string;
  promptVersion: string;
  cleanedOutput: any;
  rawResponse: string;
  duration: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  traceId?: string;
  userId?: string;
}

/**
 * AI 審計日誌保存：R2 (冷儲存) + ai_audit_logs (索引)
 */
export const saveAIAuditLog = async (data: AIAuditData): Promise<void> => {
  try {
    const supabase = await getSupabaseAdmin();
    
    let rawKey: string | null = null;
    let actualRawResponse = data.rawResponse;
    const maxRawLengthForDb = 5000; // if R2 fails, we store truncated data in DB directly, but we won't crash

    // 1. 尝试上传原始输出到 R2
    try {
      const timestamp = Date.now();
      rawKey = `ai_logs/${data.photoId || 'global'}/${timestamp}_${uuidv4().slice(0, 8)}.json`;
      const uploadResult = await uploadToR2(rawKey, actualRawResponse);
      
      if (!uploadResult.success) {
        logger.error('[AIAudit] Failed to upload AI raw result to R2:', uploadResult.error);
        rawKey = null; // Mark as failed
      }
    } catch (e) {
      logger.error('[AIAudit] R2 Exception:', e);
      rawKey = null;
    }
    
    // 如果 R2 上传失败，我们依然将其写入数据库，否则 AI 分析就没有记录了
    if (!rawKey && typeof actualRawResponse === 'string' && actualRawResponse.length > maxRawLengthForDb) {
         // Truncate to avoid DB bloat if R2 fails
         actualRawResponse = actualRawResponse.substring(0, maxRawLengthForDb) + '\n...[TRUNCATED DUE TO R2 FAILURE]';
    }

    // 2. 写入数据库
    const { error } = await supabase.from('ai_audit_logs').insert({
      photo_id: data.photoId,
      model: data.model,
      prompt_version: data.promptVersion,
      cleaned_output: data.cleanedOutput,
      raw_storage_path: rawKey,
      error_message: rawKey ? data.errorMessage : (data.errorMessage ? `${data.errorMessage}\n\nRAW_DATA:\n${actualRawResponse}` : actualRawResponse),
      // Fallback for raw data if R2 wasn't used/failed (though schema must support it if you query it later, or just put it in a metadata json if schema supports it, but since schema has error_message we can use it to know it failed)
      duration: data.duration,
      status: data.status,
      trace_id: data.traceId,
      user_id: data.userId || null,
      created_at: new Date().toISOString()
    });
    
    if (error) {
      logger.error('[AIAudit] Failed to save AI audit log into DB:', error);
      // 資料庫失敗，刪除已上傳的 R2 檔案 (回滾)
      if (rawKey) {
        await deleteFromR2(rawKey);
      }
    } else {
      logger.info(`[AIAudit] Successfully saved AI audit log for ${data.photoId || 'global'}`);
    }
  } catch (err: any) {
    logger.error('[AIAudit] Save task exception:', err.message);
  }
};

/**
 * 核心 AI 執行管道
 * 封裝：測速 + 審計日誌 + JSON 解析 + I18n 歸一化
 */
export async function executeAITask(options: AITaskOptions) {
  const { task, provider, model, messages, prompt, metadata, shouldNormalize = true } = options;
  const maxRetries = 3;
  let lastError: any = null;
  const startTime = Date.now();

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const iterStartTime = Date.now();
      const result = await provider.chat(messages);
      const iterEndTime = Date.now();

      // 1. 自動審計日誌 (用於 logger 輸出和後端控制台)
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
        // Removed prompt and large response from general logs to prevent system_logs bloat
        // Raw data is now exclusively handled by ai_audit_logs + R2
        response_summary: auditedResponse?.substring(0, 500) + (auditedResponse?.length > 500 ? '...' : ''),
        latency_ms: iterEndTime - iterStartTime,
        token_usage: result.usage,
        status: result.success ? 'success' : 'error',
        error_message: result.error,
        trace_id: metadata?.traceId,
        user_id: metadata?.userId,
        photo_id: metadata?.photoId
      });

      if (!result.success) {
        throw new Error(result.error || 'AI 調用失敗');
      }

      // 2. 解析 JSON
      let data;
      try {
        data = extractJSON(result.text || '{}');
      } catch (parseError: any) {
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

      // 4. 保存審計日誌到 ai_audit_logs (阻塞式)
      await saveAIAuditLog({
        photoId: metadata?.photoId,
        model: model,
        promptVersion: 'v1',
        cleanedOutput: data,
        rawResponse: result.text || auditedResponse,
        duration: Date.now() - startTime,
        status: 'success',
        traceId: metadata?.traceId,
        userId: metadata?.userId
      });

      return {
        data,
        rawText: result.text || auditedResponse
      };
      
    } catch (error: any) {
      lastError = error;
      
      if (i < maxRetries) {
        // 等待後重試 (指數退避 1s, 2s, 4s)
        const backoffMs = Math.pow(2, i) * 1000;
        logger.warn(`[executeAITask] Failed, retrying in ${backoffMs}ms... (Attempt ${i + 1}/${maxRetries}):`, error.message);
        await new Promise(res => setTimeout(res, backoffMs));
      }
    }
  }

  // 5. 最後一次失敗：記錄日誌 + 返回降級值 (不中斷流程)
  logger.error(`[executeAITask] Max retries reached for task ${task}. Last error:`, lastError);
  
  // 記錄失敗的審計日誌
  await saveAIAuditLog({
    photoId: metadata?.photoId,
    model: model,
    promptVersion: 'v1',
    cleanedOutput: null,
    rawResponse: lastError?.message || 'Max retries reached',
    duration: Date.now() - startTime,
    status: 'failed',
    errorMessage: lastError?.message,
    traceId: metadata?.traceId,
    userId: metadata?.userId
  });

  // Return fallback data matching expected schema
  return {
     _fallback: true,
     _error: lastError?.message || 'Unknown error'
  };
}
