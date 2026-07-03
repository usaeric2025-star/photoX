import React from 'react';

export function PhotoErrorDisplay({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const errorMessage = 
    error instanceof Error ? error.message : 
    typeof error === 'string' ? error : 
    'Error loading photos';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-red-50 text-red-600 rounded-lg">
      <div className="mb-2">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-sm font-medium mb-4 text-center">
        {errorMessage}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
