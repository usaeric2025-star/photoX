import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useVirtualizer, VirtualizerOptions } from '@tanstack/react-virtual';
import { PHOTO_GRID_CONFIG } from '@/config/virtuoso.config';
import { useInteractionBridge } from './useInteractionBridge';

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
  footer?: React.ReactNode;
};

export const VirtualGrid = forwardRef<any, VirtualGridProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bridge = useInteractionBridge();
  const lanes = props.lanes || 1;

  // Track the actual container element's width
  const [containerWidth, setContainerWidth] = React.useState<number>(800);

  React.useEffect(() => {
    if (!containerRef.current) return;
    
    // Set initial width safely
    setContainerWidth(containerRef.current.clientWidth || 800);

    if (typeof window === 'undefined' || !window.ResizeObserver) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width || 800);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Let's decide whether we are virtualizing rows or single items
  const isGridLayout = lanes > 1;
  const count = isGridLayout ? Math.ceil(props.count / lanes) : props.count;

  const estimateSize = React.useCallback(
    (index: number) => {
      if (isGridLayout) {
        // Mathematically precise row height based on width of grid column cells
        // paddingX = 12px (based on container padding style "px-1.5")
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
  });

  // Force measurements rebuild when containerWidth or lanes changes
  React.useEffect(() => {
    virtualizer.measure();
  }, [containerWidth, lanes, virtualizer]);

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
      className={props.containerClassName || ''}
      style={{ overflowY: 'auto', height: '100%', width: '100%' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
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
                  transform: `translate3d(0, ${virtualRow.start}px, 0)`,
                }}
              >
                {props.renderItem(virtualRow.index)}
              </div>
            );
          }

          // Grid row layout
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
                transform: `translate3d(0, ${virtualRow.start}px, 0)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: lanes }).map((_, laneIndex) => {
                const itemIndex = virtualRow.index * lanes + laneIndex;
                if (itemIndex >= props.count) {
                  return <div key={`empty-${laneIndex}`} />;
                }
                return (
                  <div key={itemIndex} className="h-full w-full">
                    {props.renderItem(itemIndex)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {props.footer}
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';
