import * as v from 'valibot';
import { useAppForm } from './useAppForm';

/**
 * Form Factory (集中化 Schema 管理)
 * 確保所有表單使用統一的驗證 Schema 定義
 */
export function createFormFactory<T extends v.GenericSchema>(schema: T) {
  return (options: Omit<Parameters<typeof useAppForm<T>>[0], 'schema'>) => {
    return useAppForm({
      ...options,
      schema,
    });
  };
}
