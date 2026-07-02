import React, { useMemo, useRef, useEffect, useState } from 'react';
import { VList } from 'virtua';

import { translations } from '#src/locales/index.js';
import { useUI } from '#lib/store/index.js';

interface VirtualizedGridProps<T> {
  items: T[];
  columns: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  rowGap?: number;
  columnGap?: number;
  containerRef?: React.Ref<any>;
  onScroll?: (offset: number) => void;
  onScrollEnd?: () => void;
  footer?: React.ReactNode;
}

export function VirtualizedGrid<T extends { id: string | number }>({
  items,
  columns,
  renderItem,
  rowGap = 0,
  columnGap = 0,
  containerRef,
  onScroll,
  onScrollEnd,
  footer,
}: VirtualizedGridProps<T>) {
  const scrollOffsetRef = useRef(0);
  const [cooldown, setCooldown] = useState(true);

  // Set up a cooldown whenever the item count changes (e.g. on mount or loading next page)
  // to avoid double/triple trigger of onScrollEnd during layouts
  useEffect(() => {
    setCooldown(true);
    const timer = setTimeout(() => {
      setCooldown(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [items.length]);

  const rows = useMemo(() => {
    const r = [];
    for (let i = 0; i < items.length; i += columns) {
      const rowItems = items.slice(i, i + columns);
      r.push({
        id: rowItems[0]?.id || `row-${i}`,
        items: rowItems,
        startIndex: i
      });
    }
    return r;
  }, [items, columns]);

  const handleScroll = (offset: number) => {
    scrollOffsetRef.current = offset;
    onScroll?.(offset);
  };

  const handleScrollEnd = () => {
    // Only trigger onScrollEnd if the user has actually scrolled (offset > 50px)
    // and we're not currently in the initialization/mounting cooldown phase.
    if (scrollOffsetRef.current > 50 && !cooldown) {
      onScrollEnd?.();
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <VList 
        key={`vlist-${columns}-${items.length > 0 ? 'active' : 'empty'}`}
        ref={containerRef}
        bufferSize={3000}
        onScroll={handleScroll} 
        onScrollEnd={handleScrollEnd}
        style={{ height: '100%', width: '100%' }}
      >
        {rows.map((row) => (
          <div 
            key={row.id} 
            className="flex w-full"
            style={{ 
              marginBottom: rowGap,
              paddingLeft: columnGap / 2,
              paddingRight: columnGap / 2
            }}
          >
            {row.items.map((item, colIndex) => {
              const index = row.startIndex + colIndex;
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    width: `${100 / columns}%`,
                    padding: columnGap / 2
                  }}
                >
                  {renderItem(item, index)}
                </div>
              );
            })}
          </div>
        ))}
        {footer && <div className="w-full pb-20">{footer}</div>}
      </VList>
    </div>
  );
}
