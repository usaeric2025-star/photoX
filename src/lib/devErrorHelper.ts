// 在控制台输入 __getLastError() 查看最近错误
export const setupDevErrorHelper = () => {
    if (!import.meta.env.DEV) {
      (window as any).__getLastError = () => {
        const lastError = (window as any).__LAST_ERROR__;
        if (lastError) {
          console.group('🔴 最近错误');
          console.log('消息:', lastError.message);
          console.log('堆栈:', lastError.stack);
          console.log('时间:', lastError.timestamp);
          console.groupEnd();
        } else {
          console.log('暂无错误');
        }
        return lastError;
      };
    }
  };
