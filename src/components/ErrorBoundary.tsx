import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 生产环境下可以对接 Sentry 等日志系统
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-[400px] w-full flex items-center justify-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="text-center space-y-4 max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">出错了</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {this.state.error?.message || '组件渲染过程中发生了意外错误，请尝试重新加载页面'}
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all active:scale-95"
                >
                  刷新页面
                </button>
                <button
                  onClick={() => (window.location.href = '/')}
                  className="px-6 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-95"
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
