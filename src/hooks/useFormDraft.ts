import { useState, useCallback } from 'react';

/**
 * 通用表单草稿管理 Hook
 * 避免在组件层滥用 useState，并提供重置能力
 */
export function useFormDraft<T>(initialData: T) {
  const [draft, setDraft] = useState<T>(initialData);

  const updateDraft = useCallback((updates: Partial<T>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(initialData);
  }, [initialData]);

  return { draft, updateDraft, resetDraft };
}
