import { useState, useCallback, useRef, useEffect } from 'react';
import { type Type } from 'arktype';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

interface UseFormSubmitOptions<TData, TResult> {
  schema: Type<TData>;
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
}

export function useFormSubmit<TData, TResult>({
  schema,
  mutationFn,
  onSuccess,
  onError,
  successMessage = '儲存成功',
  errorMessage = '儲存失敗，請稍後重試',
  keepOpen = false,
  debounce = 0,
  abortable = false,
  optimisticUpdate,
  rollbackOnError,
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

          // 1. Schema Validation
          const result = schema(rawData);
          if (result instanceof Error) {
            const msg = result.message;
            showToast.error(msg);
            
            let newFieldErrors: Record<string, string> = {};
            if ('byPath' in result && typeof result.byPath === 'object' && result.byPath) {
               for (const [path, error] of Object.entries(result.byPath as Record<string, any>)) {
                 newFieldErrors[path] = error.message.replace(/^.*?must be /, '必須是 '); // basic translation, or just keep raw error if prefered
               }
            }

            setState({ isLoading: false, isError: true, isSuccess: false, error: msg, fieldErrors: newFieldErrors });
            onError?.(msg);
            return resolve(false);
          }

          const data = result as TData;

          // 2. Optimistic Update
          if (optimisticUpdate) {
            optimisticUpdate(data);
          }

          // 3. AbortController
          const controller = new AbortController();
          if (abortable) {
            abortController.current = controller;
          }

          try {
            // 4. Mutation Execution
            const res = await mutationFn(data, controller.signal);
            
            setState({ isLoading: false, isError: false, isSuccess: true, error: null, fieldErrors: {} });
            showToast.success(successMessage);
            onSuccess?.(res);
            return resolve(true);
          } catch (err: unknown) {
            // 5. Error Handling
            if (err instanceof Error && err.name === 'AbortError') {
              setState({ isLoading: false, isError: false, isSuccess: false, error: null, fieldErrors: {} });
              return resolve(false);
            }

            const appError = ErrorFactory.fromUnknown(err);
            const userMsg = appError.userMessage ?? errorMessage;
            
            showToast.error(userMsg);
            ErrorFactory.capture(appError);
            
            setState({ isLoading: false, isError: true, isSuccess: false, error: userMsg, fieldErrors: {} });
            onError?.(userMsg);

            // 6. Rollback
            if (rollbackOnError) {
              rollbackOnError(err, data);
            }
            return resolve(false);
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
    ]
  );

  return { submit, cancel, reset, clearFieldError, ...state };
}
