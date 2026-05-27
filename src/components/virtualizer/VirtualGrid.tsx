import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useVirtualizer, VirtualizerOptions } from '@tanstack/react-virtual';
import { PHOTO_GRID_CONFIG } from '@/config/virtuoso.config';
import { useInteractionBridge } from './useInteractionBridge';
import { cn } from '@/lib/utils';

/**
 * @remarks
 * VirtualGridRow 是行虛擬化的原子單元。computeLaneIndex 為其內部實現細節，嚴禁提取為獨立導出函數或在行容器外使用
 */
interface VirtualGridRowProps {
  rowIndex: number;
  lanes: number;
  count: number;
  itemOffset: number;
  renderItem: (index: number) => React.ReactNode;
  measureElement: (element: HTMLDivElement | null) => void;
  virtualRow?: any;
}

/**
 * @contract {
 *   "dom_invariants": [
 *     "根節點必須有 data-contract='virtual-grid-row'",
 *     "內部必須有 data-contract='row-grid-layout' 且 display: grid",
 *     "禁止使用 position: absolute 定位子項"
 *   ],
 *   "ai_maintenance_rule": "重構此組件時必須保留所有 data-contract 屬性"
 * }
 */
const VirtualGridRow: React.FC<VirtualGridRowProps> = ({
  rowIndex,
  lanes,
  count,
  itemOffset,
  renderItem,
  measureElement,
  virtualRow
}) => {
  /**
   * @contract {
   *   "invariants": [
   *     "返回值必須在 [0, lanesCount-1] 範圍內",
   *     "lane === 0 或 undefined 時必須回退到 index % lanesCount",
   *     "lanesCount <= 0 時必須返回 0"
   *   ],
   *   "forbidden": ["禁止調用任何 DOM API", "禁止讀取外部狀態"],
   *   "ai_maintenance_rule": "修改此函數前必須先更新 @contract 並通過 vitest"
   * }
   */
  const computeLaneIndex = (lane: number | undefined, index: number, lanesCount: number): number => {
    if (lanesCount <= 0) return 0;
    if (lane !== undefined && lane !== 0) return lane;
    return Math.max(0, index % lanesCount);
  };

  return (
    <div
      ref={measureElement}
      data-index={rowIndex}
      data-contract="virtual-grid-row"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translate3d(0, ${itemOffset}px, 0)`,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      <div
        data-contract="row-grid-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))`,
          width: '100%',
        }}
      >
        {Array.from({ length: lanes }).map((_, _laneIndex) => {
          const itemIndex = rowIndex * lanes + _laneIndex;
          if (itemIndex >= count) {
            return <div key={`empty-${_laneIndex}`} />;
          }
          const computedLane = computeLaneIndex(virtualRow?.lane, itemIndex, lanes);
          return (
            <div 
              key={itemIndex} 
              className="h-full w-full"
              data-lane={computedLane}
              style={{
                gridColumnStart: computedLane + 1,
              }}
            >
              {renderItem(itemIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * @remarks
 * Strict VirtualGrid adaptation layer. 
 * Any modification requires updating tests and JSDoc markers.
 * 嚴禁注入任何業務邏輯（如 photos, groupId 等）。
 */
export type VirtualGridProps = Partial<Omit<VirtualizerOptions<HTMLDivElement, Element>, 'getScrollElement'>> & {
  count: number;
  estimateSize: (index: number) => number;
  renderItem: (index: number) => React.ReactNode;
  containerClassName?: string;
  onEndReached?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export const VirtualGrid = forwardRef<any, VirtualGridProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bridge = useInteractionBridge();
  const lanes = Math.max(1, props.lanes || 1);

  // Track the actual container element's width
  const [containerWidth, setContainerWidth] = React.useState<number>(800);
  const [headerHeight, setHeaderHeight] = React.useState<number>(0);

  React.useEffect(() => {
    if (!containerRef.current) return;
    
    setContainerWidth(containerRef.current.clientWidth || 800);

    if (typeof window === 'undefined' || !window.ResizeObserver) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          setContainerWidth(entry.contentRect.width || 800);
        } else if (entry.target === headerRef.current) {
          setHeaderHeight(entry.contentRect.height || 0);
        }
      }
    });
    
    observer.observe(containerRef.current);
    if (headerRef.current) observer.observe(headerRef.current);

    return () => observer.disconnect();
  }, [props.header]);

  // Let's decide whether we are virtualizing rows or single items
  const isGridLayout = lanes > 1;
  const count = isGridLayout ? Math.ceil(props.count / lanes) : props.count;

  const estimateSize = React.useCallback(
    (index: number) => {
      if (isGridLayout) {
        const paddingX = 12;
        const availableWidth = Math.max(200, containerWidth - paddingX);
        const cellWidth = availableWidth / lanes;
        return Math.max(100, Math.floor(cellWidth));
      }
      return props.estimateSize(index);
    },
    [isGridLayout, lanes, containerWidth, props.estimateSize]
  );

  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count,
    getScrollElement: () => containerRef.current!,
    estimateSize,
    overscan: props.overscan,
    measureElement: (el) => el.getBoundingClientRect().height,
    scrollPaddingStart: headerHeight,
  });

  // Force measurements rebuild when containerWidth, lanes or headerHeight changes
  React.useEffect(() => {
    virtualizer.measure();
  }, [containerWidth, lanes, headerHeight, virtualizer]);

  React.useImperativeHandle(ref, () => ({
    scrollToIndex: (args: { index: number; align?: 'start' | 'center' | 'end' | 'auto'; behavior?: 'auto' | 'smooth' }) => {
      const rowIndex = isGridLayout ? Math.floor(args.index / lanes) : args.index;
      virtualizer.scrollToIndex(rowIndex, { align: args.align, behavior: args.behavior });
    },
    scrollTo: (args: { top?: number; behavior?: 'auto' | 'smooth' }) => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: args.top, behavior: args.behavior });
      }
    }
  }));

  const lastItemIndex = virtualizer.getVirtualItems().at(-1)?.index;
  React.useEffect(() => {
    if (lastItemIndex !== undefined && lastItemIndex >= count - 1) {
      props.onEndReached?.();
    }
  }, [lastItemIndex, count, props.onEndReached]);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (options: any) => {
      const flatIndex = typeof options === 'number' ? options : options.index;
      const targetIndex = isGridLayout ? Math.floor(flatIndex / lanes) : flatIndex;
      
      if (typeof options === 'number') {
        virtualizer.scrollToIndex(targetIndex);
      } else {
        virtualizer.scrollToIndex(targetIndex, { 
          align: options.align || 'start',
          behavior: options.behavior || 'auto'
        });
      }
    },
    virtualizer,
    containerRef
  }), [virtualizer, isGridLayout, lanes]);

  return (
    <div 
      ref={containerRef} 
      className={cn("w-full h-full", props.containerClassName)}
      style={{ overflowY: 'auto', height: '100%', width: '100%' }}
    >
      {props.header && (
        <div ref={headerRef} className="w-full">
          {props.header}
        </div>
      )}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const itemOffset = virtualRow.start;
          if (!isGridLayout) {
            return (
              <div
                key={virtualRow.key}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translate3d(0, ${itemOffset}px, 0)`,
                }}
              >
                {props.renderItem(virtualRow.index)}
              </div>
            );
          }

          // Grid row layout utilizing VirtualGridRow
          return (
            <VirtualGridRow
              key={virtualRow.key}
              rowIndex={virtualRow.index}
              lanes={lanes}
              count={props.count}
              itemOffset={itemOffset}
              renderItem={props.renderItem}
              measureElement={virtualizer.measureElement}
              virtualRow={virtualRow}
            />
          );
        })}
      </div>
      {props.footer}
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';

export default VirtualGrid;
