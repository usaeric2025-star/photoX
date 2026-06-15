import { useState, useCallback, useMemo } from 'react';

export function useLightboxState(initialIndex: number, onIndexChange?: (index: number) => void) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showInfo, setShowInfo] = useState(false);

  // 當外部需要同步索引時
  const syncIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    if (onIndexChange) {
      onIndexChange(index);
    }
  }, [onIndexChange]);

  return {
    currentIndex,
    showInfo,
    goTo,
    setShowInfo,
    syncIndex
  };
}
