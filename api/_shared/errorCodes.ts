/**
 * [ERROR-CODES-STANDARDIZED] Shared Error Codes
 * Synced between backend and frontend ErrorFactory
 */
export enum ErrorCode {
  // Business/Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Data/State
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // External
  NETWORK_ERROR = 'NETWORK_ERROR',
  THIRD_PARTY_TIMEOUT = 'THIRD_PARTY_TIMEOUT',
  
  // System
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
