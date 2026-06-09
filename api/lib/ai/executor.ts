import { normalizeI18n } from "../../shared/i18n.js";
import { saveAIAuditLog } from "./logger.js";
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
  
  const startTime = Date.now();
  const result = await provider.chat(messages);
  const endTime = Date.now();

  // 1. 自動審計日誌 (不阻塞主流程)
  // 裁剪 raw_output 僅保留業務字段
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

  saveAIAuditLog({
    task,
    model,
    provider: provider.name,
    prompt,
    response: auditedResponse,
    latency_ms: endTime - startTime,
    token_usage: result.usage,
    status: result.success ? 'success' : 'error',
    error_message: result.error,
    request_metadata: metadata
  }).catch(err => console.warn(`[AuditLog-Silent-Fail] ${err.message}`));

  if (!result.success) {
    throw new Error(result.error || 'AI 調用失敗');
  }

  // 2. 解析 JSON
  let data = extractJSON(result.text || '{}');

  // 3. 多語言格式強制歸一化
  if (shouldNormalize && data) {
    if (data.name) data.name = normalizeI18n(data.name);
    if (data.description) data.description = normalizeI18n(data.description);
  }

  return data;
}
