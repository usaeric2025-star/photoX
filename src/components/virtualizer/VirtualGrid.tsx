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
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export const VirtualGrid = forwardRef<any, VirtualGridProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bridge = useInteractionBridge();
  const lanes = props.lanes || 1;

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
      className={props.containerClassName || ''}
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
                transform: `translate3d(0, ${itemOffset}px, 0)`,
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
