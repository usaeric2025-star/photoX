import { useState, useCallback, useRef } from 'react';
import { type Schema } from 'arktype';
import { toast } from 'sonner';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

interface UseFormSubmitOptions<TData, TResult> {
  schema: Schema<TData>;
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
  });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState({ isLoading: false, isError: false, isSuccess: false, error: null });
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

  const submit = useCallback(
    async (rawData: unknown): Promise<boolean> => {
      cancel(); // Cancel any pending operations

      return new Promise((resolve) => {
        const execute = async () => {
          setState({ isLoading: true, isError: false, isSuccess: false, error: null });

          // 1. Schema Validation
          const result = schema(rawData);
          if (result instanceof Error) {
            const msg = result.message;
            toast.error(msg);
            setState({ isLoading: false, isError: true, isSuccess: false, error: msg });
            onError?.(msg);
            return resolve(false);
          }

          const data = result as TData;

          // 2. Optimistic Update
          if (optimisticUpdate) {
            optimisticUpdate(data);
          }

          // 3. AbortController
          const controller = abortable ? new AbortController() : { signal: new AbortController().signal };
          abortController.current = controller as AbortController;

          try {
            // 4. Mutation Execution
            const res = await mutationFn(data, controller.signal);
            
            setState({ isLoading: false, isError: false, isSuccess: true, error: null });
            toast.success(successMessage);
            onSuccess?.(res);
            return resolve(true);
          } catch (err: unknown) {
            // 5. Error Handling
            if (err instanceof Error && err.name === 'AbortError') {
              setState({ isLoading: false, isError: false, isSuccess: false, error: null });
              return resolve(false);
            }

            const appError = ErrorFactory.fromUnknown(err);
            const userMsg = appError.userMessage ?? errorMessage;
            
            toast.error(userMsg);
            ErrorFactory.capture(appError);
            
            setState({ isLoading: false, isError: true, isSuccess: false, error: userMsg });
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

  return { submit, cancel, reset, ...state };
}
