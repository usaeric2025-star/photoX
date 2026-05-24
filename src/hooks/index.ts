// Core Hooks
export * from './core/useAuth';
export * from './core/useSettings';
export * from './core/useTaskExecutor';
export * from './core/useTasks';
export * from './core/usePermission';
export * from './core/useRouteGuard';
export * from './core/useSyncEngine';
export * from './core/useAdminMode';

// Shared Hooks
export * from './shared/uiFeedback';
export * from './shared/useMultiSelect';
export * from './shared/useDebouncedSearch';
export * from './shared/useTagsDisplay';
export * from './shared/useClickOutside';
export * from './shared/useLongPress';
export * from './shared/useScrollRestoration';
export * from './shared/useFormValidation';
export * from './shared/usePhotoFilters';
export * from './shared/useImageHash';
export * from './shared/useMountedRef';

// Admin Hooks
export * from './admin';

// Queries
export * from './queries/usePhotos';
export * from './queries/useCategories';
export * from './queries/useTags';
export * from './queries/useManufacturers';
export * from './queries/useGroups';
export * from './queries/useInvalidatePhotos';

// Mutations
export * from './core/useDeletePhoto';
export * from './core/useUpdatePhoto';
export * from './core/useGroupOperations';
export * from './core/useAdminMutations';
export * from './core/useGroupCoverMutation';
export * from './core/useSettingsMutation';
export * from './core/useBatchEditMutation';
export * from './core/useSyncMutation';

// AI Hooks
export * from './photoAi';

// Utils
export { useGalleryStore, useStore, useShallow } from '../store';
