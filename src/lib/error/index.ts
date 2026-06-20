// src/lib/error/index.ts
export { ErrorCode } from '@/shared/errorCodes';
export { ErrorCategory, ErrorSeverity, AppError, isAppError, mapCodeToStatus } from './AppError';
export { handleError, extractErrorMessage, logError } from './errorHandler';
export { ErrorFactory } from './ErrorFactory';
