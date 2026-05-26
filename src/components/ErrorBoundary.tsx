import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError, markErrorAsHandled, isErrorHandled } from '@/utils/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * @remarks
 * fallback 必須是純靜態 JSX；componentDidCatch 嚴禁觸發任何狀態更新或副作用
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isErrorHandled(error)) return;
    markErrorAsHandled(error);

    logError(error, { 
      action: 'ErrorBoundary', 
      component: 'ErrorBoundary', 
      metadata: { componentStack: info?.componentStack } 
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          Something went wrong
        </div>
      );
    }
    return this.props.children;
  }
}
