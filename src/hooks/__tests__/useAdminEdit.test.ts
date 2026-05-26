import { renderHook } from '@testing-library/react';
import { useAdminEdit } from '../admin/useAdminEdit';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('@/hooks', () => ({
  useTaskExecutor: () => ({ runTask: vi.fn() }),
  useDeletePhotoMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdatePhotoMutation: () => ({ mutateAsync: vi.fn() }),
  useBatchEditMutation: () => () => ({ mutateAsync: vi.fn() }),
  useGroupPhotosMutation: () => ({ mutateAsync: vi.fn() }),
  useUngroupMutation: () => ({ mutateAsync: vi.fn() }),
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
  useCategoriesQuery: () => ({ data: [] }),
  useTagsQuery: () => ({ data: [] }),
  useManufacturersQuery: () => ({ data: [] }),
}));

vi.mock('@/store', () => ({
  useGalleryStore: (fn: any) => fn({
    formState: {},
    updateForm: vi.fn(),
    newPhotoData: {},
    setNewPhotoData: vi.fn(),
    showOtherFields: false,
    setShowOtherFields: vi.fn(),
    resetForm: vi.fn(),
    isStaffMode: false,
    batchEditingIds: [],
    setEditPhotoId: vi.fn(),
    setBatchEditingIds: vi.fn(),
    setAlertDialog: vi.fn(),
  }),
  useShallow: (fn: any) => fn,
}));

describe('useAdminEdit', () => {
  it('should initialize with default states', () => {
    const user = { id: '1', email: 'test@test.com' } as any;
    const photos: any[] = [];
    const onComplete = vi.fn();

    const { result } = renderHook(() => useAdminEdit(user, photos, onComplete));

    expect(result.current.formState).toBeDefined();
    expect(result.current.newPhotoData).toBeDefined();
    expect(result.current.showOtherFields).toBe(false);
  });
});
