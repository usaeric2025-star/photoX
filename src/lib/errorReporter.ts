import { handleError } from '@/lib/error/errorHandler';
import { clientEnv } from '../shared/envSchema';

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
  report: (error: Error | string, context: string, level: ErrorLevel = 'error', silent: boolean = false) => {
    const route = window.location.pathname;
    const message = typeof error === 'string' ? error : error.message;
    const enrichedError = new Error(`[${context}] @ ${route}: ${message}`);
    
    // 1. Console group for Dev
    if (clientEnv.DEV) {
      const color = level === 'critical' ? '#ef4444' : level === 'error' ? '#f97316' : level === 'warn' ? '#eab308' : '#3b82f6';
      console.group(`%c🔴 [${level.toUpperCase()}] ${context}`, `color: ${color}; font-weight: bold;`);
      console.error(enrichedError);
      console.groupEnd();
    }

    // 2. Save to Local Logs
    const stack = error instanceof Error ? error.stack : undefined;
    saveToLocalLog({
      id: Math.random().toString(36).substring(7),
      time: new Date().toISOString(),
      level,
      context,
      message: enrichedError.message,
      stack
    });

    // 4. Global Handle (Toast etc)
    handleError(enrichedError, context, silent || level === 'info' || level === 'warn');
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
