import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../Button.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * LocalErrorBoundary
 * A granular error boundary to prevent local failures from crashing the entire app.
 */
export class LocalErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    ErrorFactory.handle(error, {
      silent: true,
      context: `Component:${this.props.name || 'Unknown'}`
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8 rounded-xl bg-red-50/50 border border-red-100 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-900">
              {this.props.name || 'Component'} 加载出错
            </h3>
            <p className="text-xs text-red-600/70 mt-1">
              {this.state.error?.message || '未知运行时錯誤'}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleReset}
            className="text-xs border-red-200 hover:bg-red-50 text-red-700"
          >
            嘗試恢復 / Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
