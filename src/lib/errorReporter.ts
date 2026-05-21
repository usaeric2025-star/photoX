import { globalHandleError } from '@/utils/errorHandler';

/**
 * 统一错误上报入口
 */
export const ErrorReporter = {
  /**
   * @param error 错误对象
   * @param context 错误上下文描述
   * @param silent 是否静默上报（不弹出 toast）
   */
  report: (error: any, context: string, silent: boolean = false) => {
    globalHandleError(error, context, silent);
  }
};

export const reportError = ErrorReporter.report;
