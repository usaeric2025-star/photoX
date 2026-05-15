
import { toast } from 'sonner';
import { useAdminUI } from '../context/AdminContexts';
import { useError } from '../context/ErrorContext';
import { useCallback } from 'react';

/**
 * Unified error handling strategy.
 */
export function useErrorHandler() {
  const adminUI = useAdminUI(); // Defensive: in some contexts, this might be null if not wrapped
  const { addLog } = useError();

  const handleError = useCallback((error: any, context?: string) => {
    const { setAlertDialog } = adminUI || {};
    
    // 1. Log to console
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Error] ${context ? `(${context}) ` : ''}`, error);
    }

    // 2. Extract meaningful message
    const message = error?.message || error?.error?.message || (typeof error === 'string' ? error : '未知错误');
    
    // 3. Add to ErrorLog system
    addLog(message, context);

    // 4. Decision logic for user feedback
    const lowerMessage = message.toLowerCase();
    
    // Condition A: Permission / Auth issues
    if (
      lowerMessage.includes('permission denied') || 
      lowerMessage.includes('row-level security') || 
      lowerMessage.includes('insufficient_privileges') ||
      lowerMessage.includes('not authenticated')
    ) {
      if (setAlertDialog) {
        setAlertDialog({
          title: '权限不足 / Access Denied',
          message: context ? `执行 [${context}] 时权限不足。请检查登录状态。` : '您的权限不足，无法执行此操作。',
          confirmLabel: '知道了',
          type: 'danger'
        });
      } else {
        toast.error('权限不足，请重新登录');
      }
      return;
    }

    // Condition B: Network issues
    if (
      lowerMessage.includes('fetch') || 
      lowerMessage.includes('network') || 
      lowerMessage.includes('timeout') ||
      error?.name === 'TypeError' && message === 'Failed to fetch'
    ) {
      toast.error('网络连接失败，请检查网络 / Network connection error');
      return;
    }

    // Condition C: Business logic error or AI failure
    if (context === 'AI_IDENTIFY' || (context && (context.includes('识别') || context.includes('AI')))) {
      toast.error(`AI 识别请求失败: ${message}`);
      return;
    }

    // Default Fallback
    toast.error(context ? `[${context}] ${message}` : message);
  }, [adminUI, addLog]);

  return { handleError };
}
