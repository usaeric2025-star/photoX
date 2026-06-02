const isDev = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

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
