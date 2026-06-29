import React, { useMemo } from 'react';
import { VList } from 'virtua';

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

  return (
    <div className="w-full h-full min-h-0 relative" ref={containerRef}>
      <VList 
        onScroll={onScroll} 
        onScrollEnd={onScrollEnd}
        style={{ height: '100%' }}
      >
        {rows.map((row) => (
          <div 
            key={row.id} 
            className="flex w-full"
            style={{ marginBottom: rowGap }}
          >
            {row.items.map((item, colIndex) => {
              const index = row.startIndex + colIndex;
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    width: `${100 / columns}%`,
                    paddingLeft: colIndex === 0 ? 0 : columnGap / 2,
                    paddingRight: colIndex === columns - 1 ? 0 : columnGap / 2
                  }}
                >
                  {renderItem(item, index)}
                </div>
              );
            })}
          </div>
        ))}
        {footer && <div className="w-full">{footer}</div>}
      </VList>
    </div>
  );
}
