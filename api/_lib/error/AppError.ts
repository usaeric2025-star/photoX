import { ErrorCode } from '@shared/errorCodes.js';

export class AppError extends Error {
  public code: ErrorCode | string;
  public status: number;
  public traceId?: string;

  constructor(message: string, code: ErrorCode | string = ErrorCode.INTERNAL_ERROR, status: number = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export const errorFactory = {
  wrap(err: unknown, operation: string, code: string = 'WRAP_ERROR'): AppError {
    const error = err as Error;
    const message = error.message || String(err);
    const newErr = new AppError(`[${operation}] ${message}`, code);
    if (error.stack) newErr.stack = error.stack;
    return newErr;
  },
  
  create({ message, code, status, operation }: { message: string, code?: string, status?: number, operation?: string }): AppError {
    const fullMessage = operation ? `[${operation}] ${message}` : message;
    return new AppError(fullMessage, code, status);
  },
  
  fail(err: AppError) {
    let safeMessage = err.message;
    // Prevent leaking raw SQL queries or huge base64 strings to the client
    if (safeMessage.includes('Failed query:') || safeMessage.includes('PostgresError')) {
       // We keep the operation name if present (e.g. "[api./api/photos/upsert] Database error")
       const match = safeMessage.match(/^\[(.*?)\]/);
       safeMessage = match ? `[${match[1]}] Database operation failed.` : 'Database operation failed.';
    } else {
       safeMessage = safeMessage.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[BASE64_IMAGE_TRUNCATED]');
       if (safeMessage.length > 500) {
         safeMessage = safeMessage.substring(0, 500) + '... (詳細錯誤已記錄於後端日誌)';
       }
    }

    return {
      success: false,
      error: {
        code: err.code,
        message: safeMessage,
        traceId: err.traceId
      }
    };
  }
};
