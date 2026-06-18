import { showToast } from '@/lib/ui/toast';
import type { StandardError } from '@/types/api';
import { copyToClipboard } from '@/utils/clipboard';
import { logError } from '@/lib/error/errorReporter';

/**
 * Safely extracts a clean string message from any error object
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return '未知错误';
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    // If the error property is a direct string message (e.g. { success: false, error: "缺少必要參數" })
    if (errObj.error && typeof errObj.error === 'string') return errObj.error;

    // PostgrestError or AppError
    if (errObj.message && typeof errObj.message === 'string') return errObj.message;
    
    const nestedError = errObj.error as Record<string, unknown> | undefined;
    if (nestedError?.message) return String(nestedError.message);
    
    // Handle nested response data
    const respData = (errObj.response as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;
    if (respData) {
      if (respData.message) return String(respData.message);
      const respNestedError = respData.error as Record<string, unknown> | undefined;
      if (respNestedError?.message) return String(respNestedError.message);
    }
  }

  if (error instanceof Error) return error.message;

  return String(error);
}

const normalizeError = (error: unknown, fallbackContext: string): StandardError => {
  let target = error;
  
  // If we passed an object representing a standard backend response containing an 'error' key
  if (error && typeof error === 'object' && 'error' in error) {
    const nestedError = (error as Record<string, unknown>).error;
    if (nestedError) {
      target = nestedError;
    }
  }

  // Extract traceId if available
  let traceId: string | undefined;
  if (target && typeof target === 'object' && 'traceId' in target) {
    traceId = String((target as Record<string, unknown>).traceId);
  } else if (error && typeof error === 'object' && 'traceId' in error) {
    traceId = String((error as Record<string, unknown>).traceId);
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

  // AppError structure or wrapped StandardError
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
    const targetObj = target as Record<string, unknown>;
    return {
      code: (targetObj.code as string) || 'UNKNOWN_ERROR',
      message: String(targetObj.message),
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
  return `[${error.context}] ${error.message} (Trace: ${error.traceId || 'N/A'})`;
}

export const handleError = (error: unknown, context: string, silent: boolean = false): void => {
  if (silent) return;
  const standardError = normalizeError(error, context)
  
  // Log to backend
  logError(error, { 
    action: context, 
    component: 'ErrorHandler', 
    kind: 'UNKNOWN', 
    metadata: { traceId: standardError.traceId } 
  });

  const errorId = getErrorId(standardError)
  const copyContent = buildCopyContent(standardError)

  const messageStr = standardError.message.replace(/\n/g, ' ');

  showToast.error(`操作失败`, {
    id: errorId,
    duration: 60000,
    description: `${messageStr} (追踪 ID: ${standardError.traceId || '无'})`,
    action: {
      label: '📋 复制内容',
      onClick: () => {
        copyToClipboard(copyContent, { successMessage: '已复制错误详情' });
      },
    },
  })
}



