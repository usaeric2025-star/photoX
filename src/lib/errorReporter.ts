import { globalHandleError } from '@/utils/errorHandler';

export type ErrorLevel = 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  time: string;
  level: ErrorLevel;
  context: string;
  message: string;
  stack?: string;
}

const MAX_LOGS = 100;

const saveToLocalLog = (entry: LogEntry) => {
  try {
    const existing = sessionStorage.getItem('photo_error_logs');
    const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
    logs.unshift(entry);
    // Keep only last MAX_LOGS
    if (logs.length > MAX_LOGS) {
      logs.length = MAX_LOGS;
    }
    sessionStorage.setItem('photo_error_logs', JSON.stringify(logs));
    
    // Also trigger an event for components to listen
    window.dispatchEvent(new CustomEvent('error_logs_updated'));
  } catch (e) {
    console.error('Failed to save log', e);
  }
};

export const ErrorReporter = {
  report: (error: any, context: string, level: ErrorLevel = 'error', silent: boolean = false) => {
    // 1. Console group for Dev
    if (import.meta.env.DEV) {
      const color = level === 'critical' ? '#ef4444' : level === 'error' ? '#f97316' : level === 'warn' ? '#eab308' : '#3b82f6';
      console.group(`%c🔴 [${level.toUpperCase()}] ${context}`, `color: ${color}; font-weight: bold;`);
      console.error(error);
      console.groupEnd();
    }

    // 2. Save to Local Logs
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    saveToLocalLog({
      id: Math.random().toString(36).substring(7),
      time: new Date().toISOString(),
      level,
      context,
      message,
      stack
    });

    // 3. Optional: Production Report (Placeholder for GlitchTip)
    // if (import.meta.env.PROD) {
    //    ErrorMonitor.captureException(error, { tags: { context, level } });
    // }

    // 4. Global Handle (Toast etc)
    globalHandleError(error, context, silent || level === 'info' || level === 'warn');
  },

  getLogs: (): LogEntry[] => {
    try {
      const existing = sessionStorage.getItem('photo_error_logs');
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  },

  clearLogs: () => {
    sessionStorage.removeItem('photo_error_logs');
    window.dispatchEvent(new CustomEvent('error_logs_updated'));
  }
};

export const reportError = ErrorReporter.report;
