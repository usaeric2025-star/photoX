import React, { useEffect, useState } from 'react';
import { LoadingScreen } from './LoadingScreen';

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

  // If we are currently loading, or the optional delay/intro is active AND we have no data, show full page overlay
  const showLoader = (isPending || delayLoading) && !hasData;
  // If we are refreshing but we already have data, show a subtle non-blocking top progress bar
  const showBackgroundIndicator = (isPending || delayLoading) && hasData;

  return (
    <div className="relative w-full h-full">
      {/* Non-intrusive thin gradient loader strip on the top when loading incrementally/silently */}
      {showBackgroundIndicator && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-amber-500 to-blue-500 z-[var(--z-loading)] pointer-events-none animate-shimmer" />
      )}

      {showLoader && (
        <LoadingScreen key="global-loader" />
      )}
      <div
        key="content-frame"
        className="w-full h-full animate-fade-in"
      >
        {children}
      </div>
    </div>
  );
};
