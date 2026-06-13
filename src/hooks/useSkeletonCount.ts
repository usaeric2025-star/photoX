import { useLayoutEffect, useState } from 'react';

export function useSkeletonCount(columns: number, itemAspectRatio = 1) {
  const [count, setCount] = useState(columns * 3); // fallback

  useLayoutEffect(() => {
    const updateCount = () => {
      const viewportHeight = window.innerHeight;
      const headerHeight = 120; // Estimated
      const rowHeight = (window.innerWidth / columns) * itemAspectRatio + 16;
      const visibleRows = Math.ceil((viewportHeight - headerHeight) / rowHeight);
      setCount(Math.max(visibleRows + 1, 4) * columns);
    };

    updateCount();
    window.addEventListener('resize', updateCount);
    return () => window.removeEventListener('resize', updateCount);
  }, [columns, itemAspectRatio]);

  return count;
}
