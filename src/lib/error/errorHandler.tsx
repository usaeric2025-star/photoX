import { toast } from 'sonner';
import type { StandardError } from '@/types/api';

/**
 * Safely extracts a clean string message from any error object
 */
export function extractErrorMessage(error: any): string {
  if (!error) return '未知错误';
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    // PostgrestError or AppResult.error
    if (error.message && typeof error.message === 'string') return error.message;
    if (error.error?.message) return String(error.error.message);
    
    // Handle nested response data
    const respData = error.response?.data;
    if (respData) {
      if (respData.message) return String(respData.message);
      if (respData.error?.message) return String(respData.error.message);
    }
  }

  if (error instanceof Error) return error.message;

  return String(error);
}

const normalizeError = (error: unknown, fallbackContext: string): StandardError => {
  // 提取 traceId（Mutation 工廠已注入）
  let traceId: string | undefined
  if (error && typeof error === 'object' && 'traceId' in error) {
    traceId = String((error as any).traceId)
  }

  // 後端返回的 AppResult.error 格式（含 timestamp）
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const err = error as { code: string; message: string; timestamp?: number }
    return {
      code: err.code,
      message: err.message,
      context: fallbackContext,
      traceId,
      timestamp: err.timestamp ?? Date.now(),
    }
  }

  // 標準 Error 物件
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      context: fallbackContext,
      traceId,
      timestamp: Date.now(),
      stack: error.stack,
    }
  }

  // 兜底
  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
    context: fallbackContext,
    traceId,
    timestamp: Date.now(),
  }
}

const getErrorId = (standardError: StandardError): string => {
  return `${standardError.context}:${standardError.code}`
}

const buildCopyContent = (error: StandardError): string => {
  const lines = [
    `[${error.context}]`,
    `Code: ${error.code}`,
    `Trace ID: ${error.traceId || 'N/A'}`,
    `Message: ${error.message}`,
    `Time: ${new Date(error.timestamp).toISOString()}`,
  ]
  if (error.stack) {
    lines.push(`Stack: ${error.stack}`)
  }
  return lines.join('\n')
}

export const handleError = (error: unknown, context: string, silent: boolean = false): void => {
  if (silent) return;
  const standardError = normalizeError(error, context)
  const errorId = getErrorId(standardError)
  const copyContent = buildCopyContent(standardError)

  toast.error(standardError.message, {
    id: errorId,
    action: {
      label: '📋 複製',
      onClick: () => {
        navigator.clipboard.writeText(copyContent)
        toast.success('已複製錯誤詳情')
      },
    },
  })
}



