import { describe, it, expect } from 'vitest';
import { ErrorFactory, ErrorCode, ErrorSeverity, isAppError } from '#lib/error/index.js';

describe('ErrorFactory', () => {
  it('should create validation error', () => {
    const error = ErrorFactory.validation('標題不能為空', { title: 'required' });
    expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(error.severity).toBe(ErrorSeverity.WARNING);
    expect(error.statusCode).toBe(400);
    expect(error.context?.fields).toEqual({ title: 'required' });
  });

  it('should create not found error', () => {
    const error = ErrorFactory.notFound('Photo', '123');
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.context?.resource).toBe('Photo');
    expect(error.context?.id).toBe('123');
  });

  it('should create network error with cause', () => {
    const original = new Error('ECONNREFUSED');
    const error = ErrorFactory.network(original);
    expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(error.cause).toBe(original);
  });

  it('should serialize to JSON safely', () => {
    const error = ErrorFactory.validation('test');
    const json = error.toJSON();
    expect(json.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(json.traceId).toBeDefined();
    expect(json.timestamp).toBeDefined();
  });

  it('should identify AppError correctly', () => {
    const error = ErrorFactory.fatal('test');
    expect(isAppError(error)).toBe(true);
    expect(isAppError(new Error())).toBe(false);
  });
});
