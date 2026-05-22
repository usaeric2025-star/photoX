import { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';

const isDev = import.meta.env.DEV;
const isPreview = import.meta.env.MODE === 'preview';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 挂载到 window 便于调试
    (window as any).__LAST_ERROR__ = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };
    
    // 生产环境上报
    if (!isDev && !isPreview) {
      reportError(error, 'ErrorBoundary');
    }
  }

  render() {
    if (this.state.hasError) {
      // 开发/预览环境：直接抛出
      if (isDev || isPreview) {
        throw this.state.error;
      }
      
      // 生产环境：友好提示
      return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
          <h2 className="text-xl font-bold mb-2">页面出错了</h2>
          <p className="text-gray-500 mb-4">请刷新页面重试</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded">
            刷新页面
          </button>
          <details className="mt-4 text-left text-xs text-gray-400">
            <summary>错误详情</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
              {this.state.error?.message}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
