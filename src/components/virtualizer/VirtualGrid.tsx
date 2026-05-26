import React, { useRef } from 'react';
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
};

export const VirtualGrid = (props: VirtualGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bridge = useInteractionBridge();

  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: props.count,
    getScrollElement: () => containerRef.current!,
    estimateSize: props.estimateSize,
    ...props,
  });

  return (
    <div ref={containerRef} className={props.containerClassName || 'grid'}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {props.renderItem(virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
};
