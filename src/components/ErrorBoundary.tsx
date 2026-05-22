import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (import.meta.env.DEV) {
        // 开发环境：显示完整信息
        return (
          <div className="fixed inset-0 bg-red-50 p-8 overflow-auto z-50">
            <h2 className="text-red-700 font-bold mb-4">🔴 页面错误</h2>
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <p className="font-mono text-sm text-red-600 mb-2">
                {this.state.error?.message}
              </p>
              <details>
                <summary className="cursor-pointer text-gray-600">查看堆栈</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {this.state.error?.stack}
                </pre>
              </details>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              刷新页面
            </button>
          </div>
        );
      }

      // 生产环境：显示友好提示 + 错误 ID
      const errorId = Math.random().toString(36).slice(2, 10);
      return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
          <h2 className="text-xl font-bold mb-2">页面出错了</h2>
          <p className="text-gray-600 mb-4">请刷新页面重试</p>
          <p className="text-xs text-gray-400">错误 ID: {errorId}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
