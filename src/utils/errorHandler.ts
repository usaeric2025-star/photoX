import { useGalleryStore } from '../store';

export const useErrorHandler = () => {
  const setErrors = useGalleryStore(state => state.setErrors);
  
  const handleError = (error: any, context: string) => {
    console.error(`[Error] ${context}:`, error);
    setErrors([{ 
      message: error.message || String(error), 
      context, 
      timestamp: Date.now() 
    }]);
  };

  return { handleError };
};
