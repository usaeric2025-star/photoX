import { perfAudit } from './perfAudit.js';

const isBrowser = typeof window !== 'undefined';
const isDev = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

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
    if (this.enabled || !isBrowser) console.warn('[WARN]', ...args);
  }

  error(...args: unknown[]) {
    if (this.enabled || !isBrowser) console.error('[ERROR]', ...args);
  }

  // 性能计时
  time(label: string) {
    if (this.enabled) console.time(`[TIMER] ${label}`);
  }

  timeEnd(label: string) {
    if (this.enabled) console.timeEnd(`[TIMER] ${label}`);
  }

  /**
   * 性能追踪工具
   * @param label 标签
   * @param threshold 阈值（毫秒），超过此值将输出警告
   * @param fn 执行的函数
   */
  track<T>(label: string, threshold: number, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > threshold) {
      console.warn(`[PERF] ${label} exceeded threshold (${threshold}ms): ${duration.toFixed(2)}ms`);
      // Record incident for diagnostics - skip if in worker (no localStorage)
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        perfAudit.record({ label, duration, threshold });
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
  (window as any).logger = logger;
}
