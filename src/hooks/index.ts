// Core Hooks
export { useAuth } from './core/auth/useAuth';
export { useSettings } from './useSettings';
export { useTaskExecutor } from './useTaskExecutor';
export { TaskProvider, useTasks, type BackgroundTask } from './useTasks';
export { usePermission } from './core/auth/usePermission';
export { useSyncEngine } from './useSyncEngine';
export { useAdminMode } from './core/auth/useAdminMode';
export { usePhotoUpload } from './usePhotoUpload';
export { useScrollRestoration } from '../core/infra/useScrollRestoration';
export { useLongPress } from './core/useLongPress';
export { useTranslation } from './core/useTranslation';
export { useAppLocale } from './core/useAppLocale';
export { useImagePreloader } from './core/useImagePreloader';
export { useQueryWithFallback } from './core/useQueryWithFallback';

// Domain Hooks
export * from './admin';
export * from './photo';
export * from './groups';
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

// Mutations
export { usePhotoEditMutation, usePhotoDelete, usePhotoBatchEdit, useTogglePin } from './usePhotoMutations';
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
export { useAIAutoGrouping } from './useAIAutoGrouping';
export { useAIBatchAnalysis } from './useAIBatchAnalysis';


// Utils
export { useUIStore, useStore, useShallow, useColumns } from '../store/useUIStore';
export { useErrorHandler } from './core/useErrorHandler';



