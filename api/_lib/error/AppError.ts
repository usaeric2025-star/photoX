export class AppError extends Error {
  public code: string;
  public status: number;
  public traceId?: string;

  constructor(message: string, code: string = 'INTERNAL_ERROR', status: number = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export const errorFactory = {
  wrap(err: any, operation: string, code: string = 'WRAP_ERROR'): AppError {
    const message = err.message || String(err);
    const newErr = new AppError(`[${operation}] ${message}`, code);
    newErr.stack = err.stack;
    return newErr;
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
