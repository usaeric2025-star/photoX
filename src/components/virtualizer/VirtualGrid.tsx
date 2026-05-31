import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { VList, VListHandle } from 'virtua';
import { cn } from '@/lib/utils';

/**
 * @remarks
 * Strict VirtualGrid adaptation layer using official Virtua VList API.
 * 嚴禁注入任何業務邏輯, 嚴禁過渡工程。
 */
export type VirtualGridProps = {
  count: number;
  renderItem: (index: number) => React.ReactNode;
  containerClassName?: string;
  onEndReached?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  lanes?: number;
  onScroll?: (offset: number) => void;
};

export const VirtualGrid = forwardRef<{ scrollToIndex: (index: number) => void }, VirtualGridProps>((props, ref) => {
  const vlistRef = useRef<VListHandle>(null);
  const lanes = Math.max(1, props.lanes || 1);
  const isGridLayout = lanes > 1;
  const rowCount = isGridLayout ? Math.ceil(props.count / lanes) : props.count;

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number) => {
      const targetIndex = isGridLayout ? Math.floor(index / lanes) : index;
      vlistRef.current?.scrollToIndex(targetIndex);
    }
  }), [isGridLayout, lanes]);

  const handleScroll = (offset: number) => {
    props.onScroll?.(offset);
    if (vlistRef.current) {
      const { scrollSize, viewportSize } = vlistRef.current;
      if (scrollSize && viewportSize && offset + viewportSize >= scrollSize - 200) {
        props.onEndReached?.();
      }
    }
  };

  return (
    <div className={cn("w-full h-full min-h-0", props.containerClassName)}>
      <div className="w-full shrink-0">
        {props.header}
      </div>
      <VList<any>
        ref={vlistRef}
        data={Array.from({ length: rowCount })}
        onScroll={handleScroll}
        style={{ height: '100%', width: '100%' }}
      >
        {(_, index) => (
          <React.Fragment key={index}>
            {isGridLayout ? (
              <div 
                key={`row-${index}`}
                className="grid"
                style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: lanes }).map((_, laneIndex) => {
                  const itemIndex = index * lanes + laneIndex;
                  return itemIndex < props.count ? (
                    <div key={`item-${itemIndex}`}>
                      {props.renderItem(itemIndex)}
                    </div>
                  ) : <div key={`empty-${laneIndex}`} />;
                })}
              </div>
            ) : (
              <div key={`row-${index}`}>
                {props.renderItem(index)}
              </div>
            )}
          </React.Fragment>
        )}
      </VList>
      <div className="w-full shrink-0">
        {props.footer}
      </div>
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';

export default VirtualGrid;
