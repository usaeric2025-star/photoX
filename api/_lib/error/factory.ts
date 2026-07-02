import { AppError, ErrorSeverity, ErrorCategory } from '../../../shared/AppError.js';
import { ErrorCode } from '../../../shared/errorCodes.js';

export const errorFactory = {
  wrap(err: unknown, operation: string, code: ErrorCode | string = ErrorCode.INTERNAL_ERROR): AppError {
    const error = err as any;
    let message = error?.message || String(err);
    const context: Record<string, any> = { operation };
    
    // Unwrap DrizzleQueryError or similar wrappers
    const actualError = error?.cause || error;

    if (actualError && typeof actualError === 'object') {
        const dbDetail = actualError.detail || actualError.hint || actualError.where || '';
        if (dbDetail) {
            message = `${message} (Detail: ${dbDetail})`;
        }
        if (actualError.message && actualError !== error) {
            message = `${message} - ${actualError.message}`;
        }
        if (actualError.code) {
            context.postgresCode = actualError.code;
        }
    }
    
    return new AppError({
      message: `[${operation}] ${message}`,
      code,
      category: ErrorCategory.RUNTIME,
      severity: ErrorSeverity.ERROR,
      cause: error instanceof Error ? error : undefined,
      context
    });
  },
  
  create(params: { message: string, code?: ErrorCode | string, status?: number, operation?: string, category?: ErrorCategory }): AppError {
    const fullMessage = params.operation ? `[${params.operation}] ${params.message}` : params.message;
    return new AppError({
      message: fullMessage,
      code: params.code ?? ErrorCode.INTERNAL_ERROR,
      statusCode: params.status,
      category: params.category ?? ErrorCategory.RUNTIME
    });
  },
  
  fail(err: AppError) {
    let safeMessage = err.userMessage || err.message;
    
    // Prevent leaking raw SQL queries or huge base64 strings to the client
    if (safeMessage.includes('Failed query:') || safeMessage.includes('PostgresError') || safeMessage.includes('Relation "') || safeMessage.includes('column "')) {
       // Extract operation name if present
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
