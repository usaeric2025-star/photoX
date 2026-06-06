export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export class ErrorFactory {
  static normalizeError(err: unknown): { message: string; stack?: string } {
    if (err instanceof Error) {
      return { message: err.message, stack: err.stack };
    }
    if (typeof err === 'string') {
      return { message: err };
    }
    if (typeof err === 'object' && err !== null) {
      const anyErr = err as any;
      const rawMessage = anyErr.message || anyErr.error || anyErr.msg || JSON.stringify(err);
      const message = typeof rawMessage === 'object' ? JSON.stringify(rawMessage) : String(rawMessage);
      return { message: message.slice(0, 500) };
    }
    return { message: 'Unknown error' };
  }

  static wrap(error: unknown, operation: string, resource?: string, severity: ErrorSeverity = 'high') {
    const normalized = this.normalizeError(error);
    const wrapped = new Error(`[${operation}] ${resource ? `(${resource}) ` : ''}${normalized.message}`);
    (wrapped as any).originalError = error;
    (wrapped as any).operation = operation;
    (wrapped as any).resource = resource;
    (wrapped as any).severity = severity;
    return wrapped;
  }
}
