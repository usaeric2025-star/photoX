import { ErrorCode } from '../../_shared/errorCodes.js';

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
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        traceId: err.traceId
      }
    };
  }
};
