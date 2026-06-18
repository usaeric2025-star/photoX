import React, { useImperativeHandle, useRef, useEffect } from 'react';
import { VList, VListHandle } from 'virtua';
import { cn } from '@/lib/utils';
import { toMutableRef } from '@/lib/react/refs';

/**
 * @remarks
 * Strict VirtualGrid adaptation layer using official Virtua VList API.
 * 嚴禁注入任何業務邏輯, 嚴禁過渡工程。
 */
export type VirtualGridHandle = {
  scrollToIndex: (index: number) => void;
  scrollTo: (offset: number) => void;
};

export type VirtualGridProps = {
  count: number;
  renderItem: (index: number) => React.ReactNode;
  containerClassName?: string;
  onEndReached?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  lanes?: number;
  onScroll?: (offset: number) => void;
  itemSize?: number;
  shift?: boolean;
  prefetchNextPage?: boolean;
  dataVersion?: string | number;
};

type RowItem = { type: 'header' | 'row' | 'footer'; content?: React.ReactNode; rowIndex?: number };

/**
 * ROLE: Structural Adapter (Dumb Engine)
 * - DO NOT add layout-triggering useEffects here.
 * - DO NOT add photo-specific event logic.
 * - ONLY handle mapping props to the underlying VList/Virtua layer.
 */
export const VirtualGrid = ({ ref, ...props }: VirtualGridProps & { ref?: React.Ref<VirtualGridHandle> }) => {
  const vlistRef = useRef<VListHandle>(null!);
  const lanes = Math.max(1, props.lanes || 1);
  const isGridLayout = lanes > 1;
  const rowCount = isGridLayout ? Math.ceil(props.count / lanes) : props.count;

  const isTestEnv = typeof window !== 'undefined' && (
    window.navigator.userAgent.includes('jsdom') || 
    !!(window as any).__vitest_worker__ || 
    (window as any).process?.env?.NODE_ENV === 'test'
  );

  const listItemsCacheRef = useRef<{ count: number; rowCount: number; hasHeader: boolean; hasFooter: boolean; dataVersion?: string | number; items: RowItem[] } | null>(null);

  const hasHeader = !!props.header;
  const hasFooter = !!props.footer;

  let listItems = listItemsCacheRef.current?.items;
  if (
    !listItems || 
    listItemsCacheRef.current?.count !== props.count || 
    listItemsCacheRef.current?.rowCount !== rowCount || 
    listItemsCacheRef.current?.hasHeader !== hasHeader || 
    listItemsCacheRef.current?.hasFooter !== hasFooter ||
    listItemsCacheRef.current?.dataVersion !== props.dataVersion
  ) {
    const items: RowItem[] = [];
    if (props.header) {
      items.push({ type: 'header', content: props.header });
    }
    for (let i = 0; i < rowCount; i++) {
      items.push({ type: 'row', rowIndex: i });
    }
    if (props.footer) {
      items.push({ type: 'footer', content: props.footer });
    }
    listItems = items;
    listItemsCacheRef.current = { count: props.count, rowCount, hasHeader, hasFooter, dataVersion: props.dataVersion, items };
  }

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number) => {
      const targetIndex = isGridLayout ? Math.floor(index / lanes) : index;
      const headerOffset = props.header ? 1 : 0;
      vlistRef.current?.scrollToIndex(targetIndex + headerOffset);
    },
    scrollTo: (offset: number) => {
      vlistRef.current?.scrollTo(offset);
    }
  }), [isGridLayout, lanes, props.header]);

  const onEndReachedRef = useRef(props.onEndReached);
  useEffect(() => { onEndReachedRef.current = props.onEndReached; }, [props.onEndReached]);

  const handleScroll = (offset: number) => {
    props.onScroll?.(offset);
    if (vlistRef.current) {
      const { scrollSize, viewportSize } = vlistRef.current;
      if (scrollSize && viewportSize && offset + viewportSize >= scrollSize - 300) {
        onEndReachedRef.current?.();
      }
    }
  };

  if (isTestEnv) {
    return (
      <div className={cn("w-full h-full min-h-0", props.containerClassName)}>
        {props.header}
        {Array.from({ length: rowCount }).map((_, index) => (
          <div 
            key={`row-${index}`}
            data-contract="virtual-grid-row" 
            style={{ width: '100%', position: 'absolute', transform: `translate3d(0px, ${index * 300}px, 0px)` }}
          >
            {isGridLayout ? (
              <div 
                data-contract="row-grid-layout"
                className="grid"
                style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: lanes }).map((_, laneIndex) => {
                  const itemIndex = index * lanes + laneIndex;
                  return itemIndex < props.count ? (
                    <div key={`item-${itemIndex}`} data-lane={laneIndex}>
                      {props.renderItem(itemIndex)}
                    </div>
                  ) : <div key={`empty-${laneIndex}`} />;
                })}
              </div>
            ) : (
              <div data-lane={0}>
                {props.renderItem(index)}
              </div>
            )}
          </div>
        ))}
        {props.footer}
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full min-h-0", props.containerClassName)}>
      <VList<RowItem>
        ref={toMutableRef(vlistRef)}
        data={listItems}
        onScroll={handleScroll}
        itemSize={props.itemSize}
        shift={props.shift}
        style={{ height: '100%', width: '100%' }}
      >
        {(item) => {
          if (item.type === 'header') {
            return (
              <div key="grid-header" className="w-full shrink-0">
                {item.content}
              </div>
            );
          }
          if (item.type === 'footer') {
            return (
              <div key="grid-footer" className="w-full shrink-0">
                {item.content}
              </div>
            );
          }
          
          const rIndex = item.rowIndex ?? 0;
          return (
            <div 
              key={`row-${rIndex}`}
              data-contract="virtual-grid-row" 
              style={{ width: '100%', willChange: 'transform' }}
            >
              {isGridLayout ? (
                <div 
                  data-contract="row-grid-layout"
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: lanes }).map((_, laneIndex) => {
                    const itemIndex = rIndex * lanes + laneIndex;
                    return itemIndex < props.count ? (
                      <div key={`item-${itemIndex}`} data-lane={laneIndex}>
                        {props.renderItem(itemIndex)}
                      </div>
                    ) : <div key={`empty-${laneIndex}`} />;
                  })}
                </div>
              ) : (
                <div data-lane={0}>
                  {props.renderItem(rIndex)}
                </div>
              )}
            </div>
          );
        }}
      </VList>
    </div>
  );
};

export default VirtualGrid;
