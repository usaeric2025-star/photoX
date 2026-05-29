import { useActionState, useTransition } from 'react';
import { updateGroupAction, createGroupAction } from '../../actions/groupActions';
import { ProductGroup } from '../../types';
import { StandardError } from '../../lib/validators/protocol';
import { useFeedback } from '@/hooks';
import { isOk } from '../../lib/errorFactory';

interface ActionState {
  data: ProductGroup | null;
  error: StandardError | null;
  status: 'idle' | 'pending' | 'success' | 'error';
}

/**
 * [V2.8-FORM-PARADYM]
 * Hook for managing group operations with validation.
 */
export function useGroupAction(id?: string, initialData?: ProductGroup | null) {
  const { showSuccess, handleError } = useFeedback();
  const [isPending, startTransition] = useTransition();

  const [state, submitAction] = useActionState(
    async (prevState: ActionState, formData: ProductGroup): Promise<ActionState> => {
      const result = id 
        ? await updateGroupAction(id, formData)
        : await createGroupAction(formData);
      
      if (isOk(result)) {
        showSuccess(id ? '更新成功' : '創建成功');
        return {
          data: result.value,
          error: null,
          status: 'success'
        };
      } else {
        handleError(new Error(result.error instanceof Error ? result.error.message : 'Unknown error'), `操作失敗: ${(result.error as any)?.aiDebugHint || ''}`);
        return {
          data: prevState.data,
          error: result.error as any,
          status: 'error'
        };
      }
    },
    { data: initialData || null, error: null, status: 'idle' }
  );

  const performAction = (data: ProductGroup) => {
    startTransition(() => {
      submitAction(data);
    });
  };

  return {
    state,
    isPending,
    performAction
  };
}
