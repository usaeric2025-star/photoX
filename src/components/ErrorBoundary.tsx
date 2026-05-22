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
        // 开发环境直接抛出，不隐藏
        throw this.state.error;
      }

      // 生产环境：显示友好提示
      return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
          <h2 className="text-xl font-bold mb-2">页面出错了</h2>
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
