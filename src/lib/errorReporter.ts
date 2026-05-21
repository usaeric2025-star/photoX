// 统一错误报告器
const isDev = import.meta.env.DEV;

interface ErrorReport {
  id: string;
  time: string;
  message: string;
  stack?: string;
  context: string;
}

class ErrorReporterClass {
  private errors: ErrorReport[] = [];
  private maxErrors = 50;

  report(error: Error | string, context: string): ErrorReport {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' ? error.stack : undefined;
    
    const report: ErrorReport = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      time: new Date().toLocaleTimeString(),
      message,
      stack,
      context,
    };
    
    this.errors.unshift(report);
    if (this.errors.length > this.maxErrors) this.errors.pop();
    
    // 开发环境：控制台彩色输出
    if (isDev) {
      console.groupCollapsed(`%c🔴 [${context}] ${message.slice(0, 80)}`, 'color: #ff4444; font-weight: bold');
      console.error('消息:', message);
      if (stack) console.error('堆栈:', stack);
      console.error('时间:', report.time);
      console.groupEnd();
    }
    
    return report;
  }
  
  getErrors(): ErrorReport[] {
    return this.errors;
  }
  
  clear(): void {
    this.errors = [];
  }
  
  showToast(message: string) {
    if (!isDev) return;
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 100000;
      cursor: pointer;
    `;
    toast.textContent = message.slice(0, 150);
    toast.onclick = () => toast.remove();
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }
}

export const ErrorReporter = new ErrorReporterClass();
export const reportError = (error: Error | string, context: string) => ErrorReporter.report(error, context);
