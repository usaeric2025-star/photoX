import { ErrorFactory } from '@/lib/error/ErrorFactory';
// Core Hooks
export * from './settings';
export { useTaskExecutor } from './core/useTaskExecutor';
export { TaskProvider, useTasks, type BackgroundTask } from './core/useTasks';
export { usePermission } from './core/auth/usePermission';
export { useAdminMode } from './core/auth/useAdminMode';
export { useScrollRestoration } from '../core/infra/useScrollRestoration';
export { useLongPress } from './core/useLongPress';
export { useTranslation } from './core/useTranslation';
export { useIsManagement } from './core/useIsManagement';
export { useAppLocale } from './core/useAppLocale';
export { useImagePreloader } from './core/useImagePreloader';
export { useQueryWithFallback } from './core/useQueryWithFallback';
export { useFormDraft } from './core/useFormDraft';
export { useUploadProgress } from './core/useUploadProgress';
export { useCopyToClipboard } from './core/useCopyToClipboard';
export { useMediaQuery } from './core/useMediaQuery';

// Domain Hooks
export * from './admin';
export * from './photo';
export * from './groups';

// Utils
export { useFilters } from './useFilters';
export { useUIStore, useStore, useShallow } from '../store/useUIStore';
export { useColumns } from '../features/layout/hooks/useColumns';
export { useSearchTransition } from './ui/useSearchTransition';



