// Core Hooks
export { useAuth } from './core/auth/useAuth';
export { useSettings } from './core/infra/useSettings';
export { useTaskExecutor } from './core/infra/useTaskExecutor';
export { TaskProvider, useTasks } from './core/infra/useTasks';
export { usePermission } from './core/auth/usePermission';
export { useSyncEngine } from './core/infra/useSyncEngine';
export { useAdminMode } from './core/auth/useAdminMode';
export { usePhotoAction } from './core/usePhotoAction';
export { useScrollRestoration } from '../core/infra/useScrollRestoration';

// Features Hooks
export { useBatchEdit } from '../features/photo/useBatchEdit';
export { useBatchConfirmation as useBatchConfirmDialog } from '../features/photo/useBatchConfirmDialog';
export { useMultiSelect } from '../features/photo/usePhotoSelection';
export { useTagsDisplay } from '../features/photo/useTagFiltering';
export { useAdminCategory } from '../features/admin/useCategoryManagement';
export { useFilters } from '../features/filters/useFilters';
export { useUrlFilters } from './useUrlFilters';

// Queries
export { usePhotoInfiniteList, usePhotoInfiniteGroupList } from './core/queries/useInfinitePhotos';
export { usePhotoList } from './core/queries/usePhotoList';
export { usePhotoCount } from './core/queries/usePhotoCount';
export { useCategories } from './core/queries/useCategories';
export { useTags } from './core/queries/useTags';
export { useManufacturers } from './core/queries/useManufacturers';
export { useGroupList } from './core/queries/useGroupList';
export { useGroupDetail } from './core/queries/useGroupDetail';
export { useInvalidatePhotos } from './queries/useInvalidatePhotos';

// Mutations
export { usePhotoEdit } from './core/mutations/usePhotoEdit';
export { usePhotoDelete } from './core/mutations/usePhotoDelete';
export { usePhotoBatchEdit } from './core/mutations/usePhotoBatchEdit';
export { useTagCreate } from './core/mutations/useTagCreate';
export { useTagEdit } from './core/mutations/useTagEdit';
export { useTagDelete } from './core/mutations/useTagDelete';
export { useCategoryCreate } from './core/mutations/useCategoryCreate';
export { useCategoryEdit } from './core/mutations/useCategoryEdit';
export { useCategoryDelete } from './core/mutations/useCategoryDelete';
export { useManufacturerCreate } from './core/mutations/useManufacturerCreate';
export { useManufacturerEdit } from './core/mutations/useManufacturerEdit';
export { useManufacturerDelete } from './core/mutations/useManufacturerDelete';
export { useGroupCreate } from './core/mutations/useGroupCreate';
export { useGroupEdit, useGroupPhotosMutation, useRemoveFromGroupMutation, useUngroupMutation } from './core/mutations/useGroupEdit';
export { useGroupDelete } from './core/mutations/useGroupDelete';
export { useGroupCoverMutation } from './core/mutations/useGroupCoverMutation';
export { useSettingsMutation } from './core/mutations/useSettingsMutation';
export { useSyncMutation } from './core/mutations/useSyncMutation';

// Utils
export { useUIStore, useStore, useShallow } from '../store/useUIStore';
export { useErrorHandler } from '../lib/error/errorHandler';
export { useTranslation } from './useTranslation';



