import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  key?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const { hasError, error, errorInfo } = (this as any).state;
    if (hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-red-600 text-white p-6 overflow-auto">
          <h1 className="text-2xl font-bold mb-4 whitespace-normal">Something went wrong.</h1>
          <div className="text-sm border p-4 bg-red-700 font-mono break-all whitespace-pre-wrap">
            {error?.toString()}
            <br />
            {errorInfo?.componentStack}
          </div>
          <button 
            className="mt-4 px-6 py-3 bg-white text-red-600 font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
