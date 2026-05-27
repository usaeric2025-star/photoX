// Core Hooks
export * from './core/auth/useAuth';
export * from './core/infra/useSettings';
export * from './core/infra/useTaskExecutor';
export * from './core/infra/useTasks';
export * from './core/auth/usePermission';
export * from './core/auth/useRouteGuard';
export * from './core/infra/useSyncEngine';
export * from './core/auth/useAdminMode';
export * from './core/usePhotoAction';
export * from './core/useGroupAction';

// Shared Hooks
export * from './shared/useFeedback';
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
export * from './core/mutations/useDeletePhoto';
export * from './core/mutations/useUpdatePhoto';
export * from './core/mutations/useGroupOperations';
export * from './core/mutations/useAdminMutations';
export * from './core/mutations/useGroupCoverMutation';
export * from './core/mutations/useSettingsMutation';
export * from './core/mutations/useBatchEditMutation';
export * from './core/mutations/useSyncMutation';

// AI Hooks
export * from './photoAi';

// Utils
export { useGalleryStore, useStore, useShallow } from '../store';
