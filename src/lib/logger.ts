const isDev = typeof process !== 'undefined' 
  ? process.env.NODE_ENV !== 'production' 
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);
const isTest = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'test'
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test');

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private enabled: boolean = isDev && !isTest;

  debug(...args: unknown[]) {
    if (this.enabled) console.debug('[DEBUG]', ...args);
  }

  info(...args: unknown[]) {
    if (this.enabled) console.info('[INFO]', ...args);
  }

  warn(...args: unknown[]) {
    console.warn('[WARN]', ...args);
  }

  error(...args: unknown[]) {
    console.error('[ERROR]', ...args);
  }

  // 性能计时
  time(label: string) {
    if (this.enabled) console.time(`[TIMER] ${label}`);
  }

  timeEnd(label: string) {
    if (this.enabled) console.timeEnd(`[TIMER] ${label}`);
  }

  /**
   * 性能追蹤工具
   * @param label 標籤
   * @param threshold 閾值（毫秒），超過此值將輸出警告
   * @param fn 執行的函數
   */
  track<T>(label: string, threshold: number, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > threshold) {
      console.warn(`[PERF] ${label} exceeded threshold (${threshold}ms): ${duration.toFixed(2)}ms`);
      // Record incident for diagnostics - skip if in worker (no localStorage)
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        import('./perfAudit.js').then(({ perfAudit }) => {
          perfAudit.record({ label, duration, threshold });
        }).catch(() => {});
      }
    } else if (this.enabled) {
      this.debug(`${label} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }
}

export const logger = new Logger();

// 挂载到 window 方便调试
if (isDev && typeof window !== 'undefined') {
  (window as Window & { logger?: Logger }).logger = logger;
}
