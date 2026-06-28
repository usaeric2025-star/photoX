import { ErrorFactory } from '@/lib/error/ErrorFactory';
import type { GenericSchema } from 'valibot';
import { ValiError } from 'valibot';

export const errorService = {
  handle: (error: unknown, context?: Record<string, unknown>) => {
    ErrorFactory.handle(error, { context: (context?.context as string) || '操作' });
    return ErrorFactory.fromUnknown(error);
  },

  fromValibot: (error: ValiError<GenericSchema>) => {
    return errorService.handle(error, { context: 'validation' });
  },
};
