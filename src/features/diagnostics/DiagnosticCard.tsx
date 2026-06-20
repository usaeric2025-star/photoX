import React from 'react';
import { RefreshCw, CheckCircle2, ShieldAlert, Zap } from '@/components/ui/Icon';

interface DiagnosticCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onTest: () => void;
  isPending: boolean;
  result: {
    success: boolean;
    message: string;
    stage?: string;
    error?: string;
    latency?: number;
  } | null;
  successColor?: string;
}

/**
 * [ATOMIC-COMPONENT] DiagnosticCard
 * For infrastructure health checks (R2, Workers, etc.)
 */
export function DiagnosticCard({ 
  title, desc, icon, onTest, isPending, result, successColor = 'text-green-500' 
}: DiagnosticCardProps) {
  return (
    <div className="bg-white border border-brand-navy/5 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-brand-navy tracking-tight">{title}</h3>
          <p className="text-xs text-brand-navy/60">{desc}</p>
        </div>
        <button
          onClick={onTest}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy text-white rounded-xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? '测试中' : '测试'}
        </button>
      </div>

      {result && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          result.success 
            ? 'bg-slate-500/5 border-slate-500/10' 
            : 'bg-red-500/5 border-red-500/10 text-red-700'
        }`}>
          <div className="mt-0.5">
            {result.success ? (
               <CheckCircle2 className={`w-4 h-4 ${successColor}`} />
            ) : (
               <ShieldAlert className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-xs font-bold ${result.success ? 'text-gray-900' : 'text-red-800'}`}>
              {result.success ? `${title}测试通过` : `${title}异常`}
            </h4>
            <div className="text-[10px] mt-1 opacity-80 leading-relaxed font-mono truncate">
              {result.success ? result.message : `${result.stage}: ${result.error}`}
              {result.latency && ` (${result.latency}ms)`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
