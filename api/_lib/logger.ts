type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const logger = {
  info: (msg: string, meta?: any) => log('info', msg, meta),
  warn: (msg: string, meta?: any) => log('warn', msg, meta),
  error: (msg: string, meta?: any) => log('error', msg, meta),
  debug: (msg: string, meta?: any) => log('debug', msg, meta),
};

function log(level: LogLevel, msg: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const output = {
    timestamp,
    level: level.toUpperCase(),
    message: msg,
    ...meta,
  };

  if (level === 'error') {
    console.error(JSON.stringify(output));
  } else {
    // In production, we might want to skip debug/info to reduce noise
    if (level === 'debug' && process.env.NODE_ENV !== 'development') return;
    console.log(JSON.stringify(output));
  }
}
