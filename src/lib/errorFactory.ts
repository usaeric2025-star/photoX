export class ErrorFactory {
  static wrap(originalError: unknown, operation: string, resource?: string): Error {
    const msg = resource 
      ? `[${operation}] ${resource}: ${originalError instanceof Error ? originalError.message : String(originalError)}`
      : `[${operation}]: ${originalError instanceof Error ? originalError.message : String(originalError)}`;
    
    return new Error(msg, { cause: originalError });
  }
}

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'UPLOAD_FAILED'
  | 'DB_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

export interface AppError {
  ok: false;
  error: true;
  message: string;
  code: ErrorCode;
  context?: string;
  timestamp: number;
  cause?: unknown;
}

export interface AppSuccess<T> {
  ok: true;
  data: T;
}

export type AppResult<T> = AppSuccess<T> | AppError;

export function errorFactory(
  message: string,
  code: ErrorCode = 'UNKNOWN',
  context?: string,
  cause?: unknown
): AppError {
  return {
    ok: false,
    error: true,
    message,
    code,
    context,
    timestamp: Date.now(),
    cause,
  };
}

export function success<T>(data: T): AppSuccess<T> {
  return { ok: true, data };
}

// COMPATIBILITY SHIMS
export const ok = success;
export function err(message: string, code: ErrorCode = 'UNKNOWN') { return errorFactory(message, code); }
export function createError(message: string) { return errorFactory(message); }

// Type alias for compatibility
export type Result<T, E = any> = AppResult<T>;

export function isErr<T>(result: AppResult<T>): result is AppError {
  return !result.ok;
}

export function isOk<T>(result: AppResult<T>): result is AppSuccess<T> {
  return result.ok;
}

export function fromThrowable<T>(fn: () => T, context?: string): AppResult<T> {
  try {
    return success(fn());
  } catch (err) {
    let message = '';
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === 'object') {
      if ('message' in err && typeof (err as any).message === 'string') {
        message = (err as any).message;
      } else if ('error' in err && err.error && typeof err.error === 'object' && 'message' in err.error && typeof (err.error as any).message === 'string') {
        message = (err.error as any).message;
      } else {
        try {
          message = JSON.stringify(err);
        } catch {
          message = String(err);
        }
      }
    } else {
      message = String(err);
    }
    return errorFactory(message, 'UNKNOWN', context, err);
  }
}

export async function fromThrowableAsync<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<AppResult<T>> {
  try {
    return success(await fn());
  } catch (err) {
    let message = '';
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === 'object') {
      if ('message' in err && typeof (err as any).message === 'string') {
        message = (err as any).message;
      } else if ('error' in err && err.error && typeof err.error === 'object' && 'message' in err.error && typeof (err.error as any).message === 'string') {
        message = (err.error as any).message;
      } else {
        try {
          message = JSON.stringify(err);
        } catch {
          message = String(err);
        }
      }
    } else {
      message = String(err);
    }
    return errorFactory(message, 'UNKNOWN', context, err);
  }
}

export function getErrorMessage<T>(result: AppResult<T>): string | null {
  if (isOk(result)) return null;
  return result.message;
}

export function isLegacyErr(obj: any): obj is { error: true; message: string } {
  return obj && typeof obj === 'object' && obj.error === true && !('ok' in obj);
}
