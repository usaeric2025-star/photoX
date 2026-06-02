type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private enabled: boolean = process.env.NODE_ENV !== 'production';

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

  time(label: string) {
    if (this.enabled) console.time(`[TIMER] ${label}`);
  }

  timeEnd(label: string) {
    if (this.enabled) console.timeEnd(`[TIMER] ${label}`);
  }
}

export const logger = new Logger();
