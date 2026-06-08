import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GroupDetailPage } from '../../GroupDetailPage';

// Mock necessary hooks and dependencies
vi.mock('@/hooks', () => ({
  useAdminMode: () => false,
  useErrorHandler: () => ({ handleError: vi.fn() }),
  useGroupDetail: () => ({ data: { name: 'Mock Group', member_count: 5 }, isLoading: false }),
  useTasks: () => ({ tasks: [] }),
  useGroupPhotos: () => ({ 
    data: { pages: [{ photos: [], total: 0 }] }, 
    isLoading: false, 
    hasNextPage: false, 
    isFetchingNextPage: false 
  }),
  useUrlFilters: () => ({
    filters: { groupId: 'mock-id' },
    setGroupId: vi.fn(),
    setPhotoId: vi.fn(),
  }),
}));

vi.mock('@/store/useUIStore', () => ({
  useUIStore: vi.fn(() => 'zh'),
  useShallow: (fn: any) => fn,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

describe('GroupDetailPage', () => {
  it('renders correctly', () => {
    render(<GroupDetailPage />);
    // Simply check if header elements appear
    expect(screen.getByText(/Mock Group/i)).toBeDefined();
  });
});
