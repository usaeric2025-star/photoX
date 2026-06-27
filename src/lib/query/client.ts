import { SWRConfig } from 'swr';
import { ErrorFactory } from '@/lib/error';

export const swrConfig = {
  // ✅ 快取時間 (5 分鐘)
  dedupingInterval: 5 * 60 * 1000,
  // ✅ 重新驗證策略
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  // ✅ 錯誤重試
  errorRetryCount: 3,
  errorRetryInterval: 3000,
  // ✅ 載入中顯示舊資料
  keepPreviousData: true,
  // ✅ 統一錯誤處理
  onError: (error: Error) => {
    ErrorFactory.capture(error);
  },
};
