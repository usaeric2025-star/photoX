import React, { Component, ReactNode } from 'react';
import { ErrorReporter } from '@/lib/errorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: error.stack || '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorReporter.report(error, this.props.context || 'React Component');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      if (import.meta.env.DEV) {
        return (
          <div className="p-4 m-4 bg-red-50 border border-red-300 rounded-lg">
            <h3 className="text-red-700 font-bold mb-2">🔴 组件错误</h3>
            <p className="text-red-600 text-sm mb-2">{this.state.error?.message}</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600">堆栈</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-60 text-xs">
                {this.state.errorInfo}
              </pre>
            </details>
            <button onClick={this.handleReset} className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm">
              重试
            </button>
          </div>
        );
      }

      return (
        <div className="p-8 text-center">
          <p className="text-gray-500">页面出错了，请刷新重试</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-blue-500">刷新页面</button>
        </div>
      );
    }
    return this.props.children;
  }
}
