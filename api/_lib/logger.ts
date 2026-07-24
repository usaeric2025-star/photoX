import { AsyncLocalStorage } from 'node:async_hooks';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const logContext = new AsyncLocalStorage<{ requestId?: string; [key: string]: unknown }>();

export const logger = {
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
};

function serializeError(err: Error) {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(err as unknown as Record<string, unknown>),
  };
}

function log(level: LogLevel, msg: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const context = logContext.getStore() || {};
  
  let metaObj: Record<string, unknown> = { ...context };
  
  if (meta !== undefined) {
    if (meta instanceof Error) {
      metaObj = { ...metaObj, error: serializeError(meta) };
    } else if (typeof meta === 'object' && meta !== null && !Array.isArray(meta)) {
      // Check if any sub-property is an Error
      for (const [key, val] of Object.entries(meta)) {
        if (val instanceof Error) {
          metaObj[key] = serializeError(val);
        } else {
          metaObj[key] = val;
        }
      }
    } else {
      metaObj = { ...metaObj, meta };
    }
  }

  const output = {
    timestamp,
    level: level.toUpperCase(),
    message: msg,
    ...metaObj,
  };

  if (level === 'error') {
    console.error(JSON.stringify(output));
  } else {
    // In production, we might want to skip debug/info to reduce noise
    if (level === 'debug' && process.env.NODE_ENV !== 'production') return;
    console.log(JSON.stringify(output));
  }
}

export async function measurePerformance<T>(label: string, fn: () => Promise<T>, threshold: number = 1000): Promise<T> {
    const start = performance.now();
    try {
        return await fn();
    } finally {
        const end = performance.now();
        const duration = end - start;
        if (duration > threshold) {
            logger.warn(`[PERF] ${label} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
        } else if (process.env.NODE_ENV !== 'production') {
            logger.debug(`[PERF] ${label} took ${duration.toFixed(2)}ms`);
        }
    }
}

