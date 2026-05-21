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
  componentStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '', componentStack: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: error.stack || '', componentStack: '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorReporter.report(error, this.props.context || 'React Component');
    this.setState({ componentStack: errorInfo.componentStack || '' });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: '', componentStack: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      if (import.meta.env.DEV) {
        return (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <h3 className="text-red-800 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Runtime Error
            </h3>
            
            <div className="bg-white border border-red-100 rounded-lg p-3 mb-3">
              <p className="text-red-600 font-bold text-sm mb-1">{this.state.error?.name}: {this.state.error?.message}</p>
              <p className="text-gray-400 text-[10px] uppercase font-bold tracking-tighter">Context: {this.props.context || 'Unknown'}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 mb-4">
              <details className="group">
                <summary className="cursor-pointer text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors list-none flex items-center gap-1">
                  <span>▶</span> Stack Trace
                </summary>
                <pre className="mt-2 p-3 bg-slate-900 text-slate-300 rounded-lg overflow-auto max-h-60 text-[10px] font-mono leading-relaxed">
                  {this.state.errorInfo}
                </pre>
              </details>

              {this.state.componentStack && (
                <details className="group">
                  <summary className="cursor-pointer text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors list-none flex items-center gap-1">
                    <span>▶</span> Component Stack
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-800 text-slate-400 rounded-lg overflow-auto max-h-60 text-[10px] font-mono leading-relaxed">
                    {this.state.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <button 
              onClick={this.handleReset} 
              className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              Attempt Recovery
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
