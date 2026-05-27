import { toast as sonnerToast, type ExternalToast } from 'sonner';

/**
 * @sonner-contract Unified Toast Entry
 * All toast notifications must pass through this wrapper.
 */
export const toast = {
  success: (message: string | React.ReactNode, data?: ExternalToast) => sonnerToast.success(message, data),
  error: (message: string | React.ReactNode, data?: ExternalToast) => sonnerToast.error(message, data),
  info: (message: string | React.ReactNode, data?: ExternalToast) => sonnerToast.info(message, data),
  warning: (message: string | React.ReactNode, data?: ExternalToast) => sonnerToast.warning(message, data),
  message: (message: string | React.ReactNode, data?: ExternalToast) => sonnerToast.message(message, data),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
