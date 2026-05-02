
import { useAdminUI } from '../context/AdminContexts';

/**
 * Unified error handling strategy.
 * - setAlertDialog for errors requiring user acknowledgment.
 * - showToast for transient notifications.
 */
export function useErrorHandler() {
  const { setAlertDialog, showToast } = useAdminUI();

  const handleError = (error: any, context?: string) => {
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Error Handler] ${context || 'General Error'}:`, error);
    }

    const message = error?.message || String(error) || '發生未知錯誤';

    // Heuristics for critical vs non-critical errors
    const isCritical = 
      message.includes('permission denied') || 
      message.includes('auth') || 
      message.includes('Critical') ||
      error?.isCritical;

    if (isCritical) {
      setAlertDialog({
        title: '關鍵錯誤 / Critical Error',
        message: `${context ? `[${context}] ` : ''}${message}`,
        confirmLabel: '知道了',
        type: 'danger'
      });
    } else {
      showToast(`${context ? `[${context}] ` : ''}${message}`, 'error');
    }
  };

  return { handleError };
}
