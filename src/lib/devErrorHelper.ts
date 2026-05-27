import { clientEnv } from '../shared/envSchema';

// 在控制台输入 __getLastError() 查看最近错误
export const setupDevErrorHelper = () => {
    if (!clientEnv.DEV) {
      (window as any).__getLastError = () => {
        const lastError = (window as any).__LAST_ERROR__;
        if (lastError) {
          console.group('🔴 最近错误');
          // messages handled by tool
          // stacks handled by tool
          // time handled by tool
          console.groupEnd();
        } else {
          // empty handled by tool
        }
        return lastError;
      };
    }
  };
