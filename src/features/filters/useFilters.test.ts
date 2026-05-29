import { renderHook, act } from '@testing-library/react';
import { useFilters, filtersService } from './useFilters';
import { describe, it, expect, beforeEach } from 'vitest';

describe('useFilters (XState)', () => {
  beforeEach(() => {
    act(() => {
      filtersService.send({ type: 'RESET' });
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFilters());
    expect(result.current.filters.categoryId).toBeNull();
    expect(result.current.filters.tagIds).toEqual([]);
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.showGroupsCollapsed).toBe(true);
  });

  it('should update category', () => {
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current.setCategory('cat-123');
    });
    expect(result.current.filters.categoryId).toBe('cat-123');
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current.setSearch('test search');
    });
    expect(result.current.filters.searchQuery).toBe('test search');
  });

  it('should update group collapsed state', () => {
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current.setShowGroupsCollapsed(false);
    });
    expect(result.current.filters.showGroupsCollapsed).toBe(false);
  });

  it('should reset filters', () => {
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current.setCategory('cat-123');
      result.current.setSearch('test');
      result.current.resetFilters();
    });
    expect(result.current.filters.categoryId).toBeNull();
    expect(result.current.filters.searchQuery).toBe('');
  });
});
