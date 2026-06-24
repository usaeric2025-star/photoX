// src/lib/error/index.ts
import { ErrorFactory } from './ErrorFactory';
export { ErrorCode } from '@/shared/errorCodes';
export { ErrorCategory, ErrorSeverity, AppError, isAppError } from './AppError';
export { ErrorFactory };

// Re-export common methods for backward compatibility
export const handleError = (error: unknown, context: string, silent: boolean = false) => ErrorFactory.handleError(error, context, silent);
export const extractErrorMessage = (error: unknown) => ErrorFactory.extractErrorMessage(error);
