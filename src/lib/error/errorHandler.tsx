import { toast } from 'sonner';
import type { StandardError } from '@/types/api';
import { copyToClipboard } from '@/utils/clipboard';

/**
 * Safely extracts a clean string message from any error object
 */
export function extractErrorMessage(error: any): string {
  if (!error) return '未知错误';
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    // If the error property is a direct string message (e.g. { success: false, error: "缺少必要參數" })
    if (error.error && typeof error.error === 'string') return error.error;

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
  let target = error;
  
  // If we passed an object representing a standard backend response containing an 'error' key
  if (error && typeof error === 'object' && 'error' in error) {
    const nestedError = (error as any).error;
    if (nestedError) {
      target = nestedError;
    }
  }

  // Extract traceId if available
  let traceId: string | undefined;
  if (target && typeof target === 'object' && 'traceId' in target) {
    traceId = String((target as any).traceId);
  } else if (error && typeof error === 'object' && 'traceId' in error) {
    traceId = String((error as any).traceId);
  }

  // If the extracted target (or nested target) is a string, use it as the message
  if (typeof target === 'string') {
    return {
      code: 'UNKNOWN_ERROR',
      message: target,
      context: fallbackContext,
      traceId,
      timestamp: Date.now(),
    };
  }

  // AppResult.error structure or wrapped StandardError
  if (target && typeof target === 'object' && 'code' in target && 'message' in target) {
    const err = target as { code: string; message: string; timestamp?: number };
    return {
      code: err.code || 'UNKNOWN_ERROR',
      message: err.message || '未知错误',
      context: fallbackContext,
      traceId,
      timestamp: err.timestamp ?? Date.now(),
    };
  }

  // Standard Error instance
  if (target instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: target.message,
      context: fallbackContext,
      traceId,
      timestamp: Date.now(),
      stack: target.stack,
    };
  }

  // Fallback for object with a 'message' field
  if (target && typeof target === 'object' && 'message' in target) {
    return {
      code: (target as any).code || 'UNKNOWN_ERROR',
      message: String((target as any).message),
      context: fallbackContext,
      traceId,
      timestamp: Date.now(),
    };
  }

  // Deep fallback using robust message extraction
  const extractedMessage = extractErrorMessage(target);
  const finalMessage = (extractedMessage && extractedMessage !== '[object Object]')
    ? extractedMessage
    : (extractErrorMessage(error) !== '[object Object]' ? extractErrorMessage(error) : '未知错误');

  return {
    code: 'UNKNOWN_ERROR',
    message: finalMessage,
    context: fallbackContext,
    traceId,
    timestamp: Date.now(),
  };
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
        copyToClipboard(copyContent, { successMessage: '已複製錯誤詳情' });
      },
    },
  })
}



