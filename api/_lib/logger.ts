type LogLevel = 'info' | 'warn' | 'error' | 'debug';

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
    ...(err as any),
  };
}

function log(level: LogLevel, msg: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  
  let metaObj: Record<string, unknown> = {};
  if (meta !== undefined) {
    if (meta instanceof Error) {
      metaObj = { error: serializeError(meta) };
    } else if (typeof meta === 'object' && meta !== null && !Array.isArray(meta)) {
      // Check if any sub-property is an Error
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(meta)) {
        if (val instanceof Error) {
          sanitized[key] = serializeError(val);
        } else {
          sanitized[key] = val;
        }
      }
      metaObj = sanitized;
    } else {
      metaObj = { meta };
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
    if (level === 'debug' && process.env.NODE_ENV !== 'development') return;
    console.log(JSON.stringify(output));
  }
}

