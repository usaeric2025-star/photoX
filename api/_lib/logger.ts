type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const logger = {
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
};

function log(level: LogLevel, msg: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const metaObj = (meta && typeof meta === 'object' && !Array.isArray(meta)) ? (meta as Record<string, unknown>) : { meta };
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
