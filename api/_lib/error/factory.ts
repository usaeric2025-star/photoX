import { AppError, ErrorSeverity, ErrorCategory } from '../../../shared/AppError.js';
import { ErrorCode } from '../../../shared/errorCodes.js';

interface PostgresError {
    message?: string;
    detail?: string;
    hint?: string;
    where?: string;
    code?: string;
    cause?: unknown;
}

export const errorFactory = {
  wrap(err: unknown, operation: string, code: ErrorCode | string = ErrorCode.INTERNAL_ERROR): AppError {
    const error = err as PostgresError | null;
    let message = error?.message || String(err);
    const context: Record<string, unknown> = { operation };
    
    // Unwrap DrizzleQueryError or similar wrappers
    const actualError = (error?.cause || error) as PostgresError | null;

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
            
            // Map common Postgres error codes to specific codes
            if (actualError.code === '57014') {
                code = ErrorCode.TIMEOUT;
                message = `Statement timeout: The query took too long to execute. (${message})`;
            } else if (actualError.code === '23505') {
                code = ErrorCode.ALREADY_EXISTS;
            } else if (actualError.code === '23503') {
                code = ErrorCode.FAILED_PRECONDITION;
                message = `Foreign key violation: Referenced record does not exist. (${message})`;
            }
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
  
  validation(issues: any[], operation?: string): AppError {
    const issue = issues[0];
    const path = issue?.path?.map((p: any) => p.key).join('.') || 'unknown_field';
    const msg = `Validation Error on '${path}': ${issue?.message || 'Invalid format'}`;
    const fullMessage = operation ? `[${operation}] ${msg}` : msg;
    
    return new AppError({
      message: fullMessage,
      code: ErrorCode.VALIDATION_FAILED,
      statusCode: 400,
      category: ErrorCategory.VALIDATION
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
