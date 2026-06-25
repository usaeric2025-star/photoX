import { useState, useCallback, useRef, useEffect } from 'react';
import * as v from 'valibot';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { safeAsync } from '@/lib/utils/safeAsync';

interface UseFormSubmitOptions<T extends v.GenericSchema, TResult> {
  schema: T;
  mutationFn: (data: v.InferOutput<T>, signal: AbortSignal) => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  errorMessage?: string;
  keepOpen?: boolean;
  debounce?: number;
  abortable?: boolean;
  optimisticUpdate?: (data: v.InferOutput<T>) => void;
  rollbackOnError?: (error: unknown, data: v.InferOutput<T>) => void;
  context?: string;
}

export function useFormSubmit<T extends v.GenericSchema, TResult>({
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
}: UseFormSubmitOptions<T, TResult>) {
  type TData = v.InferOutput<T>;
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
            const path = firstIssue.path ? firstIssue.path.map((p) => String(p.key)).join('.') : 'root';
            const msg = firstIssue ? `字段 [${path}] 验证失败: ${firstIssue.message}` : '输入数据验证失败';
            showToast.error(msg);
            
            let newFieldErrors: Record<string, string> = {};
            for (const issue of validationResult.issues) {
              const path = issue.path ? issue.path.map((p) => String(p.key)).join('.') : 'root';
              newFieldErrors[path] = issue.message;
            }

            setState({ isLoading: false, isError: true, isSuccess: false, error: msg, fieldErrors: newFieldErrors });
            onError?.(msg);
            return resolve(false);
          }

          const data = validationResult.output as TData;

          // 2. Optimistic Update
          if (optimisticUpdate) {
            optimisticUpdate(data);
          }

          // 3. AbortController
          const controller = new AbortController();
          if (abortable) {
            abortController.current = controller;
          }

          // 4. Safe Execution
          try {
            const out = await mutationFn(data, controller.signal);
            
            setState({ isLoading: false, isError: false, isSuccess: true, error: null, fieldErrors: {} });
            showToast.success(successMessage);
            onSuccess?.(out);
            resolve(true);
          } catch (e) {
            const wrappedError = ErrorFactory.wrap(e, context);
            ErrorFactory.capture(wrappedError);
            
            if (rollbackOnError) {
              rollbackOnError(wrappedError, data);
            }
            
            const finalErrMsg = wrappedError.userMessage || errorMessage;
            showToast.error(finalErrMsg);
            setState(prev => ({ ...prev, isLoading: false, isError: true, error: finalErrMsg }));
            onError?.(finalErrMsg);
            resolve(false);
          } finally {
            if (abortController.current === controller) {
              abortController.current = null;
            }
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
