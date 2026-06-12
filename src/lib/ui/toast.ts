import { toast, ExternalToast } from 'sonner';

/**
 * [UTILITY] showToast
 * Unified toast notification system for PhotoX.
 * Standardizes positioning, duration, and z-index layering.
 */
export const showToast = {
  success: (message: string, options?: ExternalToast) => 
    toast.success(message, { 
      duration: 3000,
      position: 'bottom-center',
      className: 'z-toast',
      ...options
    }),
    
  error: (message: string, options?: ExternalToast) => 
    toast.error(message, { 
      duration: 5000,
      position: 'bottom-center',
      className: 'z-toast',
      ...options
    }),
    
  info: (message: string, options?: ExternalToast) => 
    toast.info(message, { 
      duration: 3000,
      position: 'bottom-center',
      className: 'z-toast',
      ...options
    }),
    
  loading: (message: string, options?: ExternalToast) => 
    toast.loading(message, { 
      position: 'bottom-center',
      className: 'z-toast',
      ...options
    }),
    
  dismiss: (toastId?: string | number) => 
    toast.dismiss(toastId),
};
