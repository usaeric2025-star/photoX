import React from 'react';
import { useRouter } from '@tanstack/react-router';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useTranslation } from '@/hooks/core/useTranslation';

export function RouteErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { uiTranslations: t } = useTranslation();

  const isValidationError = error.message.includes('validateSearch') || error.message.includes('Invalid search');
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-red-100 shadow-sm max-w-md mx-auto mt-20">
      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {isValidationError ? t.loadFailed('Parameters') : t.loadFailed('Page')} 
      </h3>
      <p className="text-sm text-slate-500 text-center mb-6 break-words whitespace-pre-wrap">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button
          onClick={() => reset()}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          <RefreshCw size={16} />
          {t.refresh}
        </button>
        <button
          onClick={() => {
            router.navigate({ to: '/', replace: true, search: {} });
          }}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <Home size={16} />
          {t.backToGallery}
        </button>
      </div>
    </div>
  );
}
