// src/lib/error/index.ts
import { ErrorFactory } from './ErrorFactory.js';
export { ErrorCode } from '#shared/errorCodes.js';
export { ErrorSeverity, isAppError } from '#shared/AppError.js';
export { ErrorFactory };

// Re-export common methods for backward compatibility
const handleError = (error: unknown, context: string, silent: boolean = false) => ErrorFactory.handleError(error, context, silent);
const extractErrorMessage = (error: unknown) => ErrorFactory.extractErrorMessage(error);

