import { useActionState, useTransition } from 'react';
import { updatePhotoAction } from '../../actions/photoActions';
import { ProductFormData, Photo } from '../../types';
import { Result } from 'neverthrow';
import { StandardError } from '../../lib/validators/protocol';
import { useFeedback } from '@/hooks';

interface ActionState {
  data: Photo | null;
  error: StandardError | null;
  status: 'idle' | 'pending' | 'success' | 'error';
}

/**
 * [V2.8-FORM-PARADYM]
 * React 19 Hook for managing photo updates with validation.
 */
export function usePhotoAction(id: string, initialData?: Photo | null) {
  const { showSuccess, showError, handleError } = useFeedback();
  const [isPending, startTransition] = useTransition();

  const [state, submitAction] = useActionState(
    async (prevState: ActionState, formData: ProductFormData): Promise<ActionState> => {
      const result = await updatePhotoAction(id, formData);
      
      if (result.isOk()) {
        showSuccess('保存成功 / Saved successfully');
        return {
          data: result.value,
          error: null,
          status: 'success'
        };
      } else {
        handleError(new Error(result.error.message), `保存失败: ${result.error.aiDebugHint}`);
        return {
          data: prevState.data,
          error: result.error,
          status: 'error'
        };
      }
    },
    { data: initialData || null, error: null, status: 'idle' }
  );

  const runUpdate = (data: ProductFormData) => {
    startTransition(() => {
      submitAction(data);
    });
  };

  return {
    state,
    isPending,
    runUpdate
  };
}
