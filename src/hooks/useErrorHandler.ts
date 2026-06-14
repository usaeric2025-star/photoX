import { useCallback } from 'react'
import { reportError } from '@/lib/error/errorReporter'
import { showErrorToast } from '@/lib/error/errorUI'
import { AppError, ErrorCode, ErrorFactory } from '@/lib/error/ErrorFactory'

export function useErrorHandler() {
  return useCallback((error: unknown, context?: Record<string, unknown>) => {
    // 1. 標準化為 AppError
    let appError: AppError
    if (error instanceof AppError) {
      appError = error
    } else if (error instanceof Error) {
      appError = ErrorFactory.create(ErrorCode.UNKNOWN_ERROR, error.message, context)
    } else {
      appError = ErrorFactory.create(ErrorCode.UNKNOWN_ERROR, String(error), context)
    }

    // 2. 顯示 Toast（僅用戶可見）
    showErrorToast(appError.message)

    // 3. 上報（不依賴 Toast 結果）
    reportError(appError)

    // 4. 返回標準化錯誤（供調用方使用）
    return appError
  }, [])
}
