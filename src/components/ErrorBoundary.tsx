import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';
import { logError, markErrorAsHandled, isErrorHandled } from '@/utils/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  copiedStatus: boolean;
  activeTab: 'summary' | 'stack' | 'component' | 'env' | 'diagnosis';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      componentStack: null,
      copiedStatus: false,
      activeTab: 'summary'
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isErrorHandled(error)) return;
    markErrorAsHandled(error);

    this.setState({
      componentStack: info.componentStack || null
    });

    logError(error, { action: 'ErrorBoundary', component: 'ErrorBoundary', metadata: { componentStack: info.componentStack } });
    
    toast.error(error.message || '組件渲染失敗', {
      description: '點擊複製完整錯誤信息',
      action: {
        label: '複製',
        onClick: () => navigator.clipboard.writeText(
          `${error.message}\n\n${info.componentStack}`
        ),
      },
      duration: 10000,
    });
    
    this.setState({ hasError: true });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-4 text-xs text-slate-400">
          <p>渲染已中斷</p>
        </div>
      );
    }
    return this.props.children;
  }
}
