import React, { useEffect, useState } from 'react';

interface DataLoadingContainerProps {
  isPending: boolean;
  hasData: boolean;
  showImmediateLoading?: boolean;
  children: React.ReactNode;
}

export function DataLoadingContainer({
  isPending,
  hasData,
  showImmediateLoading = false,
  children
}: DataLoadingContainerProps) {
  const [delayLoading, setDelayLoading] = useState(showImmediateLoading);

  useEffect(() => {
    if (showImmediateLoading) {
      const timer = setTimeout(() => setDelayLoading(false), 100);
      return () => clearTimeout(timer);
    } else {
      setDelayLoading(false);
    }
  }, [showImmediateLoading]);

  const showLoader = (isPending || delayLoading) && !hasData;
  const showBackgroundIndicator = (isPending || delayLoading) && hasData;

  return (
    <div className="relative w-full h-full">
      {/* Sleek, non-blocking top-edge progress indicator */}
      {(showLoader || showBackgroundIndicator) && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-slate-100 z-[9999] overflow-hidden pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-blue-500 via-amber-500 to-blue-500 animate-progress-loading origin-left" />
        </div>
      )}

      {showLoader ? (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-50/50 animate-fade-in py-16">
          <div className="flex flex-col items-center gap-3.5">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200/80" />
              <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 animate-spin" />
            </div>
            <div className="text-xs text-slate-400 font-medium tracking-widest uppercase animate-pulse">
              LOADING
            </div>
          </div>
        </div>
      ) : (
        <div
          key="content-frame"
          className="w-full h-full animate-fade-in"
        >
          {children}
        </div>
      )}
    </div>
  );
};
