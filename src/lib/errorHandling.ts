import { globalHandleError } from '../utils/errorHandler';

// Global Unhandled Promise Rejection handler
export const setupGlobalErrorHandling = () => {
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    
    const reason = event.reason;
    const message = reason?.message || String(reason || '');
    
    // Check for cancellable triggers to keep logs clean
    const isCancellation = 
      reason?.name === 'AbortError' || 
      /cancel|abort|precondition|offline/i.test(message) ||
      message.includes('DOMException') ||
      message.includes('user_cancel') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError');
      
    if (isCancellation) {
      console.warn('[Global] 捕获良性后台任务取消或网络中断 Rejection:', message);
      return;
    }

    // Treat the reason of unhandled promise rejection as the error
    globalHandleError(reason || new Error(message || 'Unhandled Promise Rejection'), '全局未处理Promise拒绝', true);
  });

  window.addEventListener('error', (event) => {
    // Treat the error object or message as the error
    globalHandleError(event.error || new Error(event.message || '全局运行时错误'), '全局运行时错误');
  });
};
