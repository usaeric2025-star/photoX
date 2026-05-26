import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VirtualGrid } from '../VirtualGrid';

describe('VirtualGrid', () => {
  let originalClientHeight: any;
  let originalOffsetHeight: any;

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
  });

  afterAll(() => {
    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
    }
    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
  });

  it('renders correctly with default props', () => {
    const { container } = render(
      <VirtualGrid count={10} estimateSize={() => 100} renderItem={(i) => <div>{i}</div>} />
    );
    expect(container).toBeDefined();
  });

  it('safely handles lane calculation fallback and avoids NaN in translation styles', () => {
    render(
      <VirtualGrid 
        count={5} 
        lanes={3} 
        estimateSize={() => 120} 
        renderItem={(i) => <div data-testid={`test-item-${i}`}>Item {i}</div>} 
      />
    );

    const items = screen.queryAllByTestId(/test-item-/);
    expect(items.length).toBeGreaterThan(0);

    items.forEach((item) => {
      // Wrapper div is item.parentElement, absolute row is item.parentElement.parentElement
      const absoluteRow = item.parentElement?.parentElement;
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
});
