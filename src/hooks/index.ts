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
export { useMultiSelect } from '../features/photo/usePhotoSelection';
export { useTagsDisplay } from '../features/photo/useTagFiltering';
export { useAdminCategory } from '../features/admin/useCategoryManagement';
export { useUrlFilters } from './useUrlFilters';
export { useLightbox } from './useLightbox';

// Queries
export { usePhotos, useGroupPhotos } from './core/queries/usePhotos';
export { usePhotoDetail } from './core/queries/usePhotoDetail';
export { usePhotoCount } from './core/queries/usePhotoCount';
export { useCategories } from './core/queries/useCategories';
export { useTags } from './core/queries/useTags';
export { useManufacturers } from './core/queries/useManufacturers';
export { useGroups } from './core/queries/useGroups';
export { useGroupDetail } from './core/queries/useGroupDetail';
export { useInvalidatePhotos } from './queries/useInvalidatePhotos';

// Mutations
export { usePhotoEdit, usePhotoDelete, usePhotoBatchEdit, useTogglePin } from './core/usePhotoEditor';
export { 
  useTagCreate, useTagEdit, useTagDelete,
  useCategoryCreate, useCategoryEdit, useCategoryDelete,
  useManufacturerCreate, useManufacturerEdit, useManufacturerDelete,
  useSyncMutation
} from './core/mutations/useAdminMutations';
export { 
  useGroupCreate, useGroupUpdate, useGroupDelete, useGroupCoverMutation, 
  useGroupPhotosMutation, useRemoveFromGroupMutation, useUngroupMutation, 
  useGroupMutations 
} from './core/mutations/useGroupMutations';
export { useSettingsUpdateMutation, useSettingsMutations } from './core/mutations/useSettingsMutations';
export { useAIGroup } from './core/mutations/useAIGroup';


// Utils
export { useUIStore, useStore, useShallow } from '../store/useUIStore';
export { useErrorHandler } from '../lib/error/errorHandler';
export { useTranslation } from './useTranslation';



