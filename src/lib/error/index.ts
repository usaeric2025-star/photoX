// src/lib/error/index.ts
import { ErrorFactory } from './ErrorFactory';
export { ErrorCode } from '@/shared/errorCodes';
export {  ErrorSeverity,  isAppError } from './AppError';
export { ErrorFactory };

// Re-export common methods for backward compatibility
const handleError = (error: unknown, context: string, silent: boolean = false) => ErrorFactory.handleError(error, context, silent);
const extractErrorMessage = (error: unknown) => ErrorFactory.extractErrorMessage(error);
