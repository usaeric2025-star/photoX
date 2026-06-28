import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { showToast } from '@/lib/ui/toast';
import { ValiError } from 'valibot';

export const errorService = {
  handle: (error: unknown, context?: Record<string, unknown>) => {
    // Wrap to get the AppError, then handle it (which shows the toast)
    const appError = ErrorFactory.wrap(error, (context?.context as string) || '操作');
    ErrorFactory.capture(appError);
    showToast.error(appError.userMessage, {
      description: appError.traceId ? `追蹤碼: ${appError.traceId}` : undefined,
    });
    return appError;
  },

  fromValibot: (error: ValiError<GenericSchema>) => {
    // Need to handle Valibot error issues correctly
    const formatted = error.issues.map((issue) =>
      `${issue.path?.map((p) => String((p as any).key)).join('.') || '欄位'}: ${issue.message}`
    ).join('; ');
    return errorService.handle(new Error(formatted), { context: 'validation' });
  },
};
