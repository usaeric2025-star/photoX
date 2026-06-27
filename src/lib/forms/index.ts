import { useForm } from '@tanstack/react-form';
import * as v from 'valibot';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

// ✅ 匯出 TanStack Form 核心 API
export { useForm };

// ✅ 匯出 Valibot（方便統一導入）
export { v };

// ✅ 錯誤處理工具（整合 ErrorFactory）
export function handleFormError(error: unknown) {
  ErrorFactory.handle(error, { context: 'form-submit' });
}

// ✅ 匯出專案自定義表單工具
export * from './useAppForm';
export * from './useFormSubmit';
export * from './useFormField';
export * from './AppField';
export * from './adapters/photoEditAdapter';

