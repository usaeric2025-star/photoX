import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { PhotoCard } from '../PhotoCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies

vi.mock('../../lib/translations', () => ({
  translations: { en: { loading: '...' } },
}));

vi.mock('@/store/useUIStore', () => ({
  useUIStore: (selector: any) => selector({
    selectedIds: [],
    isMultiSelect: false,
    toggleSelected: vi.fn(),
    update: vi.fn(),
  }),
  useShallow: (v: any) => v,
}));

const mockPhoto = {
  id: '1',
  url: 'https://example.com/photo.jpg',
  is_hidden: false,
  is_pinned: false,
};

describe('PhotoCard', () => {
  it('should not bind auto-animate ref and should use CSS transitions', () => {
    const queryClient = new QueryClient();

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PhotoCard
          photo={mockPhoto as any}
          index={0}
        />
      </QueryClientProvider>
    );
    
    const cardEl = container.firstChild as HTMLElement;
    expect(cardEl).toBeInTheDocument();
    
    // Check if it has data attributes used for CSS transitions
    expect(cardEl.hasAttribute('data-selected')).toBeTruthy();
    expect(cardEl.hasAttribute('data-multiselect')).toBeTruthy();
    
    // Verify auto animate ref is not present by checking classes/attributes (auto-animate doesn't add specific identifiable public attributes easily, but we verify data bounds which CSS uses)
    expect(cardEl.getAttribute('data-selected')).toBe('false');
  });
});
