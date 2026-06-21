import { normalizeI18n } from "../../_shared/i18n.js";
import { logger } from "../logger.js";
import { extractJSON } from "./utils.js";
import { db, aiAuditLogs } from '../../_lib/db/index.js';
import { eq } from "drizzle-orm";

interface AIProvider {
  name: string;
  chat: (messages: { role: string; content: unknown }[]) => Promise<{ text?: string; error?: string; success: boolean; usage?: Record<string, unknown> }>;
}

interface AITaskOptions {
  task: string;
  provider: AIProvider;
  model: string;
  prompt: string;
  messages: { role: string; content: unknown }[];
  metadata?: Record<string, unknown>;
  shouldNormalize?: boolean;
}

export interface AIAuditData {
  photoId?: string;
  model: string;
  promptVersion: string;
  cleanedOutput: Record<string, unknown> | null;
  rawResponse: string;
  duration: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  traceId?: string;
  userId?: string;
  task?: string;
  provider?: string;
  promptText?: string;
  token_usage?: Record<string, unknown>;
  cost_est?: number;
}

/**
 * AI 審計日誌保存：ai_audit_logs (索引)
 */
export const saveAIAuditLog = async (data: AIAuditData): Promise<void> => {
  try {
    let parsedRawOutput = null;
    try {
      if (typeof data.rawResponse === 'string' && data.rawResponse.startsWith('{')) {
        parsedRawOutput = JSON.parse(data.rawResponse);
      } else {
        parsedRawOutput = { raw_text: data.rawResponse };
      }
    } catch (e) {
      parsedRawOutput = { raw_text: data.rawResponse };
    }

    const jsonOutput = data.status === 'success' 
      ? data.cleanedOutput 
      : { error: data.errorMessage };

    // 写入数据库 (符合最新的 schema)
    try {
      await db.insert(aiAuditLogs).values({
        photoId: data.photoId || null,
        model: data.model,
        promptVersion: data.promptVersion || 'v1',
        cleanedOutput: jsonOutput,
        rawOutput: parsedRawOutput,
        latencyMs: data.duration,
        costEst: data.cost_est ? String(data.cost_est) : "0",
        tokenUsage: data.token_usage || null,
        status: data.status,
        createdAt: new Date()
      });
      logger.info(`[AIAudit] Successfully saved AI audit log for ${data.photoId || 'global'}`);
    } catch (dbErr) {
      logger.error('[AIAudit] Failed to save AI audit log into DB, attempting fallback save without foreign key constraint:', dbErr);
      try {
        // Fallback: 設為 null 回避外鍵約束，把原本的 photoId 完好無損記錄到 JSONB 內部，確保數據依然救回
        const fallbackCleanedOutput = {
          ...(typeof jsonOutput === 'object' && jsonOutput !== null ? jsonOutput : { originalOutput: jsonOutput }),
          _failedConstraintPhotoId: data.photoId || null
        };
        await db.insert(aiAuditLogs).values({
          photoId: null,
          model: data.model,
          promptVersion: data.promptVersion || 'v1',
          cleanedOutput: fallbackCleanedOutput,
          rawOutput: parsedRawOutput,
          latencyMs: data.duration,
          costEst: data.cost_est ? String(data.cost_est) : "0",
          tokenUsage: data.token_usage || null,
          status: data.status,
          createdAt: new Date()
        });
        logger.info(`[AIAudit] Successfully saved fallback AI audit log (avoided FK constraint) for ${data.photoId}`);
      } catch (fallbackErr) {
        logger.error('[AIAudit] Fallback AI audit log save also failed:', fallbackErr);
      }
    }
  } catch (err: unknown) {
    logger.error('[AIAudit] Save task exception:', (err as Error).message);
  }
};

/**
 * 核心 AI 執行管道
 * 封裝：測速 + 審計日誌 + JSON 解析 + I18n 歸一化
 */
export async function executeAITask(options: AITaskOptions) {
  const { task, provider, model, messages, prompt, metadata, shouldNormalize = true } = options;
  const maxRetries = 3;
  let lastError: unknown = null;
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
        response_summary: auditedResponse && typeof auditedResponse === 'string' 
            ? (auditedResponse.substring(0, 500) + (auditedResponse.length > 500 ? '...' : '')) 
            : '',
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
      } catch (parseError: unknown) {
         throw new Error('Parse failed: ' + (parseError as Error).message);
      }

      if (!data) {
         throw new Error('Parse failed: returned empty data');
      }

      // 3. 多語言格式強制歸一化
      if (shouldNormalize && data) {
        const d = data as any;
        if (d.name) d.name = normalizeI18n(d.name);
        if (d.description) d.description = normalizeI18n(d.description);
      }

        // 4. 保存審計日誌到 ai_audit_logs (阻塞式)
      await saveAIAuditLog({
        photoId: metadata?.photoId as string | undefined,
        model: model,
        promptVersion: 'v1',
        cleanedOutput: data as Record<string, unknown>,
        rawResponse: result.text || auditedResponse || '',
        duration: Date.now() - startTime,
        status: 'success',
        traceId: metadata?.traceId as string | undefined,
        userId: metadata?.userId as string | undefined,
        task,
        provider: provider.name || 'unknown',
        promptText: prompt,
        token_usage: result.usage,
        cost_est: (result.usage?.cost as number) || 0
      });

      return {
        data,
        rawText: result.text || auditedResponse || ''
      };
      
    } catch (error: unknown) {
      lastError = error;
      
      if (i < maxRetries) {
        // 等待後重試 (指數退避 1s, 2s, 4s)
        const backoffMs = Math.pow(2, i) * 1000;
        const errorMessage = error instanceof Error ? error.message : 'Unknown AI Error';
        logger.warn(`[executeAITask] Failed, retrying in ${backoffMs}ms... (Attempt ${i + 1}/${maxRetries}):`, errorMessage);
        await new Promise(res => setTimeout(res, backoffMs));
      }
    }
  }

  // 5. 最後一次失敗：記錄日誌 + 返回降級值 (不中斷流程)
  const lastErrorMessage = lastError instanceof Error ? lastError.message : 'Max retries reached';
  logger.error(`[executeAITask] Max retries reached for task ${task}. Last error:`, lastError);
  
  // 記錄失敗的審計日誌
  await saveAIAuditLog({
    photoId: metadata?.photoId as string | undefined,
    model: model,
    promptVersion: 'v1',
    cleanedOutput: null,
    rawResponse: lastErrorMessage,
    duration: Date.now() - startTime,
    status: 'failed',
    errorMessage: lastErrorMessage,
    traceId: metadata?.traceId as string | undefined,
    userId: metadata?.userId as string | undefined,
    task,
    provider: provider.name || 'unknown',
    promptText: prompt
  });

  // Return fallback data matching expected structure
  return {
     data: {
        _fallback: true,
        _error: lastErrorMessage
     },
     rawText: lastErrorMessage
  };
}
