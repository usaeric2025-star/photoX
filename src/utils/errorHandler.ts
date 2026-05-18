import { useGalleryStore } from '../store';
import { toast } from 'sonner';

export const useErrorHandler = () => {
  const setErrors = useGalleryStore(state => state.setErrors);
  
  const handleError = (error: any, context: string, silent: boolean = false) => {
    console.error(`[Error] ${context}:`, error);
    
    // UI Toast Notification
    const message = error.message || String(error);
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
