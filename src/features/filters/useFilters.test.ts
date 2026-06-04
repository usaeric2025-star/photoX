import { renderHook, act } from '@testing-library/react';
import { useFilters } from './useFilters';
import { describe, it, expect } from 'vitest';

describe('useFilters (Zustand)', () => {
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
