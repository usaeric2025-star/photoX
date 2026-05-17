import React, { ErrorInfo, ReactNode } from 'react';
import { logErrorToSupabase } from '../services/logService';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
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
    
    // Fallback to supabase log if it exists
    logErrorToSupabase(error, errorInfo);
  }

  public render() {
    const { hasError, error, errorInfo } = this.state;
    if (hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-red-50 border border-red-100 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            
            <h1 className="text-xl font-bold text-slate-900 mb-2">系统遇到一个意外错误</h1>
            <p className="text-sm text-slate-500 mb-6">程序运行出错了，给您带来不便我们深表歉意。</p>
            
            <div className="text-[10px] text-left bg-slate-900 text-slate-300 p-4 rounded-xl font-mono overflow-auto max-h-48 mb-8 break-all">
              <div className="text-red-400 font-bold mb-1">Error: {error?.toString()}</div>
              {errorInfo?.componentStack}
            </div>

            <button 
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw size={18} />
              重新呼叫系统
            </button>
            
            <p className="mt-6 text-[10px] text-slate-400">错误已自动记录，我们的工程师会尽快处理</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
