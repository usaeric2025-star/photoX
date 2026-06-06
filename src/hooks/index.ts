// Core Hooks
export { useAuth } from './core/auth/useAuth';
export { useSettings } from './useSettings';
export { useTaskExecutor } from './useTaskExecutor';
export { TaskProvider, useTasks } from './useTasks';
export { usePermission } from './core/auth/usePermission';
export { useSyncEngine } from './useSyncEngine';
export { useAdminMode } from './core/auth/useAdminMode';
export { usePhotoAction } from './usePhotoAction';
export { usePhotoUpload } from './usePhotoUpload';
export { useScrollRestoration } from '../core/infra/useScrollRestoration';
export { useLongPress } from './core/useLongPress';
export { usePerformance } from './core/usePerformance';
export { useTranslation } from './core/useTranslation';
export { useAppLocale } from './core/useAppLocale';
export { useImagePreloader } from './core/useImagePreloader';
export { useQueryWithFallback } from './core/useQueryWithFallback';

// Features Hooks
export { useBatchEdit } from '../features/photo/useBatchEdit';
export { useMultiSelect } from '../features/photo/usePhotoSelection';
export { useTagsDisplay } from '../features/photo/useTagFiltering';
export { useAdminCategory } from '../features/admin/useCategoryManagement';
export { useUrlFilters } from './useUrlFilters';
export { useLightbox } from './useLightbox';

// Queries
export { usePhotos, useGroupPhotos } from './usePhotos';
export { usePhotoDetail } from './usePhotoDetail';
export { usePhotoCount } from './usePhotoCount';
export { useCategories } from './useCategories';
export { useTags } from './useTags';
export { useManufacturers } from './useManufacturers';
export { useGroups } from './useGroups';
export { useGroupDetail } from './useGroupDetail';
export { useInvalidatePhotos } from './useInvalidatePhotos';
export { usePhotoAIResult } from './usePhotoAIResult';

// Mutations
export { usePhotoEdit, usePhotoDelete, usePhotoBatchEdit, useTogglePin } from './usePhotoEditor';
export { 
  useTagCreate, useTagEdit, useTagDelete,
  useCategoryCreate, useCategoryEdit, useCategoryDelete,
  useManufacturerCreate, useManufacturerEdit, useManufacturerDelete,
  useSyncMutation
} from './useAdminMutations';
export { 
  useGroupCreate, useGroupUpdate, useGroupDelete, useGroupCoverMutation, 
  useGroupPhotosMutation, useRemoveFromGroupMutation, useUngroupMutation, 
  useGroupMutations 
} from './useGroupMutations';
export { useSettingsUpdateMutation, useSettingsMutations } from './useSettingsMutations';
export { useAIGroup } from './useAIGroup';


// Utils
export { useUIStore, useStore, useShallow, useColumns } from '../store/useUIStore';
export { useErrorHandler } from '../lib/error/errorHandler';



