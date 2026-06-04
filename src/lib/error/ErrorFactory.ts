export class ErrorFactory {
  static wrap(error: unknown, operation: string, resource?: string) {
    const message = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(`[${operation}] ${resource ? `(${resource}) ` : ''}${message}`);
    (wrapped as any).originalError = error;
    (wrapped as any).operation = operation;
    (wrapped as any).resource = resource;
    return wrapped;
  }
}
