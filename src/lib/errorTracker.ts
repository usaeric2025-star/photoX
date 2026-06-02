import { logger } from '@/lib/logger';

type ErrorEvent = {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
};

// 内存存储（最多 20 条）
let errorHistory: ErrorEvent[] = [];

// 加载 localStorage 中的历史
const saved = typeof localStorage !== 'undefined' 
  ? localStorage.getItem('__errorHistory') 
  : null;
if (saved) {
  try {
    errorHistory = JSON.parse(saved);
  } catch {}
}

function saveToLocalStorage() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('__errorHistory', JSON.stringify(errorHistory.slice(0, 20)));
  }
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 上报错误
export function reportError(error: Error | string | unknown, context?: string) {
  const message = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));
  const stack = typeof error === 'object' && error !== null && 'stack' in error ? String(error.stack) : undefined;
  
  const event: ErrorEvent = {
    id: generateId(),
    message,
    stack,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
  };
  
  errorHistory.unshift(event);
  if (errorHistory.length > 20) errorHistory.pop();
  saveToLocalStorage();
  
  // 控制台打印
  logger.error(`🐛 ${message}`, context, stack);
}

// 获取错误历史
export function getErrorHistory() {
  return errorHistory;
}

// 清空错误历史
export function clearErrorHistory() {
  errorHistory = [];
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('__errorHistory');
  }
}

// 挂载到 window 方便调试
if (typeof window !== 'undefined') {
  (window as any).__errors = errorHistory;
  (window as any).__getErrors = () => getErrorHistory();
  (window as any).__clearErrors = () => clearErrorHistory();
  logger.info('📋 错误追踪已启动');
  logger.info('  window.__getErrors()  查看错误历史');
  logger.info('  window.__clearErrors() 清空错误历史');
}
