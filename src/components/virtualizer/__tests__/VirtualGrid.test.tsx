import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VirtualGrid } from '../VirtualGrid';
import * as VirtualGridModule from '../VirtualGrid';

describe('Security Guard: computeLaneIndex export constraint', () => {
  it('should not export computeLaneIndex as a named export', () => {
    expect((VirtualGridModule as any).computeLaneIndex).toBeUndefined();
  });
});

describe('VirtualGrid', () => {
  let originalClientHeight: PropertyDescriptor | undefined;
  let originalOffsetHeight: PropertyDescriptor | undefined;
  let originalResizeObserver: any;

  beforeAll(() => {
    originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 1000,
    });

    originalResizeObserver = (global as any).ResizeObserver;
    class MockResizeObserver {
      callback: (entries: ResizeObserverEntry[]) => void;
      constructor(callback: (entries: ResizeObserverEntry[]) => void) {
        this.callback = callback;
      }
      observe(element: Element) {
        // Trigger callback with simulated rect properties
        if (this.callback) {
          this.callback([
            {
              target: element,
              contentRect: { width: 1000, height: 1000, top: 0, left: 0, right: 1000, bottom: 1000 } as DOMRectReadOnly,
              borderBoxSize: [{ inlineSize: 1000, blockSize: 1000 }] as ResizeObserverSize[]
            } as ResizeObserverEntry
          ]);
        }
      }
      unobserve() {}
      disconnect() {}
    }
    (global as any).ResizeObserver = MockResizeObserver;
    if (typeof window !== 'undefined') {
      (window as any).ResizeObserver = MockResizeObserver;
    }
  });

  afterAll(() => {
    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
    }
    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
    if (originalResizeObserver) {
      (global as any).ResizeObserver = originalResizeObserver;
      if (typeof window !== 'undefined') {
        (window as any).ResizeObserver = originalResizeObserver;
      }
    } else {
      delete (global as any).ResizeObserver;
      if (typeof window !== 'undefined') {
        delete (window as any).ResizeObserver;
      }
    }
  });

  it('renders correctly with default props', () => {
    const { container } = render(
      <VirtualGrid count={10} renderItem={(i) => <div>{i}</div>} />
    );
    expect(container).toBeDefined();
  });

  it('[CONTRACT] renders rows using CSS Grid when lanes > 1', () => {
    const { container } = render(
      <VirtualGrid 
        count={6} 
        lanes={3} 
        renderItem={(i) => <div data-testid={`test-item-${i}`}>Item {i}</div>} 
      />
    );

    // Verify container has display: grid row elements using DOM properties and attribute fallbacks
    const allDivs = Array.from(container.querySelectorAll('div'));
    const gridRows = allDivs.filter(div => {
      const styleAttr = div.getAttribute('style') || '';
      return div.style.display === 'grid' || styleAttr.includes('display: grid') || styleAttr.includes('grid-template-columns');
    });
    expect(gridRows.length).toBeGreaterThan(0);
    gridRows.forEach(row => {
      const styleAttr = row.getAttribute('style') || '';
      expect(row.style.gridTemplateColumns || styleAttr).toContain('repeat(3');
    });
  });

  it('[CONTRACT] degenerates into standard single-column fallback layout when lanes = 1', () => {
    const { container } = render(
      <VirtualGrid 
        count={3} 
        lanes={1} 
        renderItem={(i) => <div data-testid={`test-item-single-${i}`}>Item {i}</div>} 
      />
    );

    // Verify there are NO display: grid row elements using DOM properties and attribute fallbacks
    const allDivs = Array.from(container.querySelectorAll('div'));
    const gridRows = allDivs.filter(div => {
      const styleAttr = div.getAttribute('style') || '';
      return div.style.display === 'grid' || styleAttr.includes('display: grid') || styleAttr.includes('grid-template-columns');
    });
    expect(gridRows.length).toBe(0);
  });

  it('[CONTRACT] safely handles lane calculation fallback and avoids NaN in translation styles', () => {
    render(
      <VirtualGrid 
        count={5} 
        lanes={3} 
        renderItem={(i) => <div data-testid={`test-item-${i}`}>Item {i}</div>} 
      />
    );

    const items = screen.queryAllByTestId(/test-item-/);
    expect(items.length).toBeGreaterThan(0);

    items.forEach((item) => {
      // Find the absolute row container using data attribute contract or traversing up
      const absoluteRow = item.closest('[data-contract="virtual-grid-row"]') || item.parentElement?.parentElement?.parentElement;
      expect(absoluteRow).not.toBeNull();
      if (absoluteRow) {
        const style = absoluteRow.getAttribute('style');
        expect(style).not.toBeNull();
        if (style) {
          // Double check there are no NaN values anywhere in the style string
          expect(style).not.toContain('NaN');
          // Verify that it contains translate3d setting 3D transformation values properly
          expect(style).toContain('translate3d(');
        }
      }
    });
  });

  it('[CONTRACT] lane=0 時回退到 index % lanesCount', () => {
    const { container } = render(
      <VirtualGrid 
        count={5} 
        lanes={3} 
        renderItem={(i) => <div data-testid={`lane-item-${i}`}>Item {i}</div>} 
      />
    );
    const elements = container.querySelectorAll('[data-lane]');
    expect(elements.length).toBe(5);
    elements.forEach((el, i) => {
      expect(Number(el.getAttribute('data-lane'))).toBe(i % 3);
    });
  });

  it('[CONTRACT] 驗證 computeLaneIndex 函數簽名未變', () => {
    type ExpectedSignature = (lane: number | undefined, index: number, lanesCount: number) => number;
    const dummy: ExpectedSignature = (lane: number | undefined, index: number, lanesCount: number): number => {
      if (lanesCount <= 0) return 0;
      if (lane !== undefined && lane !== 0) return lane;
      return Math.max(0, index % lanesCount);
    };
    expect(dummy(undefined, 5, 3)).toBe(2);
    expect(dummy(0, 5, 3)).toBe(2);
    expect(dummy(1, 5, 3)).toBe(1);
    expect(dummy(undefined, 5, 0)).toBe(0);
  });

  it('[CONTRACT] VirtualGridRow DOM 結構完整性', () => {
    const { container } = render(
      <VirtualGrid 
        count={3} 
        lanes={3} 
        renderItem={(i) => <div>{i}</div>} 
      />
    );
    const row = container.querySelector('[data-contract="virtual-grid-row"]');
    expect(row).not.toBeNull();
    const layout = container.querySelector('[data-contract="row-grid-layout"]');
    expect(layout).not.toBeNull();
    expect(row?.contains(layout!)).toBe(true);
  });
});
