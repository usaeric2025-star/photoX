import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError, markErrorAsHandled, isErrorHandled } from '@/utils/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * @remarks
 * Agent v3.0 Intelligent ErrorBoundary.
 * Provides diagnosis logging and manual recovery mechanism.
 * fallback MUST be static JSX to prevent recursion.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Static report method for non-component code
   */
  static report(error: Error, context: string) {
    console.error(`[EB-DIAG-REPORT] context: ${context} | error: ${error.message}`);
    logError(error, { action: 'ManualReport', component: context });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isErrorHandled(error)) return;
    markErrorAsHandled(error);

    // Structured diagnostic logging for Agent v3.0
    const source = (error.stack?.split('\n')[1] || 'unknown').trim();
    const trigger = error.message || 'unspecified error';
    const boundary = info?.componentStack?.split('\n')[1]?.trim() || 'unknown boundary';
    
    console.error(`[EB-DIAG] source: ${source} | trigger: ${trigger} | boundary: ${boundary}`);
    console.error(`[EB-DIAG] stack: ${error.stack}`);

    logError(error, { 
      action: 'ErrorBoundary', 
      component: 'ErrorBoundary', 
      metadata: { 
        componentStack: info?.componentStack,
        diagnostic: { source, trigger, boundary }
      } 
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '24px', 
          textAlign: 'center', 
          border: '1px solid #fee2e2', 
          backgroundColor: '#fef2f2', 
          borderRadius: '12px',
          margin: '16px',
          boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#991b1b', marginBottom: '4px' }}>
            區塊載入失敗 / Loading Error
          </h2>
          <p style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '16px', opacity: 0.8 }}>
            {this.state.error?.message || '發生未知錯誤'}
          </p>
          <button 
            onClick={this.handleReset}
            style={{
              padding: '8px 24px',
              backgroundColor: '#ef4444',
              color: 'white',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
            }}
          >
            重試 / Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
