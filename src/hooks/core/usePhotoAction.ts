import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { updatePhotoAction } from '../../actions/photoActions';
import { ProductFormData, Photo } from '../../types';
import { StandardError } from '../../lib/validators/protocol';
import { toast } from '@/lib/ui/toast';
import { useErrorHandler, useInvalidatePhotos } from '@/hooks';
import { ErrorFactory } from '../../lib/error/ErrorFactory';

interface ActionState {
  data: Photo | null;
  error: StandardError | null;
  status: 'idle' | 'pending' | 'success' | 'error';
}

/**
 * [V2.8-FORM-PARADYM]
 * React Query Hook for managing photo updates with validation.
 */
export function usePhotoAction(id: string, initialData?: Photo | null) {
  const { handleError } = useErrorHandler();
  const invalidatePhotos = useInvalidatePhotos();
  
  const [state, setState] = useState<ActionState>({ 
    data: initialData || null, 
    error: null, 
    status: 'idle' 
  });

  const mutation = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      const result = await updatePhotoAction(id, formData);
      if (!result.ok) {
        throw ErrorFactory.wrap(new Error(result.message), 'updatePhotoAction', id);
      }
      return result;
    },
    onMutate: () => {
      setState(prev => ({ ...prev, status: 'pending' }));
    },
    onSuccess: (result) => {
      toast.success('保存成功 / Saved successfully');
      invalidatePhotos();
      setState({
        data: result.data,
        error: null,
        status: 'success'
      });
    },
    onError: (err) => {
      handleError(err, `保存失败: ${err.message}`);
      setState(prev => ({
        data: prev.data,
        error: { message: err.message, code: 'UNKNOWN_ERROR', ok: false, context: '' } as any,
        status: 'error'
      }));
    }
  });

  const runUpdate = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  return {
    state,
    isPending: mutation.isPending,
    runUpdate
  };
}
