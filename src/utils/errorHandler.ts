import { useGalleryStore } from '../store';
import { toast } from 'sonner';

export const useErrorHandler = () => {
  const setErrors = useGalleryStore(state => state.setErrors);
  
  const handleError = (error: any, context: string, silent: boolean = false) => {
    console.error(`[Error] ${context}:`, error);
    
    // UI Toast Notification
    let message = '';
    if (typeof error === 'string') {
        message = error;
    } else if (error instanceof Error) {
        message = error.message;
    } else if (error && typeof error === 'object' && error.message) {
        message = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
    } else {
        message = JSON.stringify(error);
    }
    
    if (!silent) {
      toast.dismiss();
      toast.error(`${context}: ${message}`);
    }
    
    // Store Error for Audit
    setErrors([{ 
      message, 
      context, 
      timestamp: Date.now() 
    }]);
  };

  return { handleError };
};
