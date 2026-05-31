import React, { useEffect, useState } from 'react';
import { FullPageLoading } from '../FullPageLoading';
import { motion, AnimatePresence } from 'motion/react';

interface DataLoadingContainerProps {
  isLoading: boolean;
  hasData: boolean;
  showImmediateLoading?: boolean;
  children: React.ReactNode;
}

export function DataLoadingContainer({
  isLoading,
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
  const showLoader = (isLoading || delayLoading) && !hasData;
  // If we are refreshing but we already have data, show a subtle non-blocking top progress bar
  const showBackgroundIndicator = (isLoading || delayLoading) && hasData;

  return (
    <div className="relative w-full h-full">
      {/* Non-intrusive thin gradient loader strip on the top when loading incrementally/silently */}
      <AnimatePresence>
        {showBackgroundIndicator && (
          <motion.div
            initial={{ opacity: 0, width: '0%' }}
            animate={{ 
              opacity: 1, 
              width: ['0%', '80%', '100%'],
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              width: { duration: 2, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.5 },
              opacity: { duration: 0.2 }
            }}
            className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-amber-500 to-blue-500 z-[9999] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoader && (
          <FullPageLoading key="global-loader" />
        )}
        <motion.div
            key="content-frame"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
      </AnimatePresence>
    </div>
  );
};
