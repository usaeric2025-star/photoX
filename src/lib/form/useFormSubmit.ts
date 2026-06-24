import { useState, useCallback, useRef, useEffect } from 'react';
import * as v from 'valibot';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { safeAsync } from '@/lib/utils/safeAsync';

interface UseFormSubmitOptions<TData, TResult> {
  schema: v.BaseSchema<any, TData, any>;
  mutationFn: (data: TData, signal: AbortSignal) => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  errorMessage?: string;
  keepOpen?: boolean;
  debounce?: number;
  abortable?: boolean;
  optimisticUpdate?: (data: TData) => void;
  rollbackOnError?: (error: unknown, data: TData) => void;
  context?: string;
}

export function useFormSubmit<TData, TResult>({
  schema,
  mutationFn,
  onSuccess,
  onError,
  successMessage = '保存成功',
  errorMessage = '保存失败，请稍后重试',
  keepOpen = false,
  debounce = 0,
  abortable = false,
  optimisticUpdate,
  rollbackOnError,
  context = '表单提交',
}: UseFormSubmitOptions<TData, TResult>) {
  const [state, setState] = useState({
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null as string | null,
    fieldErrors: {} as Record<string, string>,
  });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState({ isLoading: false, isError: false, isSuccess: false, error: null, fieldErrors: {} });
  }, []);

  const clearFieldError = useCallback((name: string) => {
    setState((prev) => {
      if (!prev.fieldErrors[name]) return prev;
      const newErrors = { ...prev.fieldErrors };
      delete newErrors[name];
      return { ...prev, fieldErrors: newErrors };
    });
  }, []);

  const cancel = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return cancel;
  }, [cancel]);

  const submit = useCallback(
    async (rawData: unknown): Promise<boolean> => {
      cancel(); // Cancel any pending operations

      return new Promise((resolve) => {
        const execute = async () => {
          setState({ isLoading: true, isError: false, isSuccess: false, error: null, fieldErrors: {} });

          // 1. Valibot Validation
          const validationResult = v.safeParse(schema, rawData);
          
          if (!validationResult.success) {
            const firstIssue = validationResult.issues[0];
            const msg = firstIssue ? `字段 [${firstIssue.path?.map((p: any) => p.key).join('.')}] 验证失败: ${firstIssue.message}` : '输入数据验证失败';
            showToast.error(msg);
            
            let newFieldErrors: Record<string, string> = {};
            for (const issue of validationResult.issues) {
              const path = issue.path?.map((p: any) => p.key).join('.') || 'root';
              newFieldErrors[path] = issue.message;
            }

            setState({ isLoading: false, isError: true, isSuccess: false, error: msg, fieldErrors: newFieldErrors });
            onError?.(msg);
            return resolve(false);
          }

          const data = validationResult.output;

          // 2. Optimistic Update
          if (optimisticUpdate) {
            optimisticUpdate(data);
          }

          // 3. AbortController
          const controller = new AbortController();
          if (abortable) {
            abortController.current = controller;
          }

          // 4. Safe Execution using safeAsync
          const res = await safeAsync(async () => {
            const out = await mutationFn(data, controller.signal);
            
            setState({ isLoading: false, isError: false, isSuccess: true, error: null, fieldErrors: {} });
            showToast.success(successMessage);
            onSuccess?.(out);
            return out;
          }, {
            context,
            onFinally: () => {
              if (abortController.current === controller) {
                abortController.current = null;
              }
            }
          });

          if (res !== null) {
            resolve(true);
          } else {
            // Handle Rollback if error occurred
            if (rollbackOnError) {
              rollbackOnError(new Error(errorMessage), data);
            }
            setState(prev => ({ ...prev, isLoading: false, isError: true, error: errorMessage }));
            onError?.(errorMessage);
            resolve(false);
          }
        };

        if (debounce > 0) {
          debounceTimer.current = setTimeout(execute, debounce);
        } else {
          execute();
        }
      });
    },
    [
      cancel,
      schema,
      mutationFn,
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      debounce,
      abortable,
      optimisticUpdate,
      rollbackOnError,
      context
    ]
  );

  return { submit, cancel, reset, clearFieldError, ...state };
}
