const isDev = typeof process !== 'undefined' 
  ? process.env.NODE_ENV !== 'production' 
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);
const isTest = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'test'
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test');

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private enabled: boolean = isDev && !isTest;

  debug(...args: any[]) {
    if (this.enabled) console.debug('[DEBUG]', ...args);
  }

  info(...args: any[]) {
    if (this.enabled) console.info('[INFO]', ...args);
  }

  warn(...args: any[]) {
    console.warn('[WARN]', ...args);
  }

  error(...args: any[]) {
    console.error('[ERROR]', ...args);
  }

  // 性能计时
  time(label: string) {
    if (this.enabled) console.time(`[TIMER] ${label}`);
  }

  timeEnd(label: string) {
    if (this.enabled) console.timeEnd(`[TIMER] ${label}`);
  }
}

export const logger = new Logger();

// 挂载到 window 方便调试
if (isDev && typeof window !== 'undefined') {
  (window as any).logger = logger;
}
