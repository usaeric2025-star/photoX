import { renderHook, act } from '@testing-library/react';
import { useMultiSelect } from '../useMultiSelect';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Real mock for the store
vi.mock('../../store', () => {
  const store = {
    state: {
      isMultiSelect: false,
      selectedIds: [] as string[],
    },
    setState: (fn: any) => {
      if (typeof fn === 'function') {
        store.state = { ...store.state, ...fn(store.state) };
      } else {
        store.state = { ...store.state, ...fn };
      }
    },
    getState: () => store.state,
  };

  const useStore = (selector: any) => selector(store.state);
  (useStore as any).getState = store.getState;
  (useStore as any).setState = store.setState;

  return {
    useGalleryStore: useStore,
    useStore: useStore,
  };
});

import { useGalleryStore } from '../../store';

describe('useMultiSelect', () => {
  beforeEach(() => {
    (useGalleryStore as any).setState({
      isMultiSelect: false,
      selectedIds: [],
      setIsMultiSelect: (val: boolean) => (useGalleryStore as any).setState({ isMultiSelect: val }),
      setSelectedIds: (ids: string[]) => (useGalleryStore as any).setState({ selectedIds: ids }),
    });
  });

  it('should toggle selection', () => {
    const { result, rerender } = renderHook(() => useMultiSelect());
    
    act(() => {
      result.current.toggle('photo-1');
    });
    
    rerender();
    expect((useGalleryStore as any).getState().selectedIds).toContain('photo-1');
  });

  it('should enable and disable multi-select', () => {
    const { result, rerender } = renderHook(() => useMultiSelect());
    
    act(() => {
      result.current.enable('photo-1');
    });
    
    rerender();
    expect((useGalleryStore as any).getState().isMultiSelect).toBe(true);
    expect((useGalleryStore as any).getState().selectedIds).toEqual(['photo-1']);

    act(() => {
      result.current.disable();
    });
    
    rerender();
    expect((useGalleryStore as any).getState().isMultiSelect).toBe(false);
    expect((useGalleryStore as any).getState().selectedIds).toEqual([]);
  });
});
