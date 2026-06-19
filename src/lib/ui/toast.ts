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
      ...options
    }),
    
  error: (message: string, options?: ExternalToast) => 
    toast.error(message, { 
      duration: 5000,
      position: 'bottom-center',
      ...options
    }),
    
  info: (message: string, options?: ExternalToast) => 
    toast.info(message, { 
      duration: 3000,
      position: 'bottom-center',
      ...options
    }),

  warning: (message: string, options?: ExternalToast) => 
    toast.warning(message, { 
      duration: 4000,
      position: 'bottom-center',
      ...options
    }),
    
  loading: (message: string, options?: ExternalToast) => 
    toast.loading(message, { 
      position: 'bottom-center',
      ...options
    }),
    
  dismiss: (toastId?: string | number) => 
    toast.dismiss(toastId),
};
