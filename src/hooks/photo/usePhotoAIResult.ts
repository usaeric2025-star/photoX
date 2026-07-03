import { STALE_TIMES } from '#lib/query/config.js';
import { useAppQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { PhotoAIResult } from '#src/types/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

/**
 * 获取照片对应的 AI 识别原始源代碼與解析後的 JSON 數據。
 */
export const usePhotoAIResult = (photoId: string, options?: { enabled?: boolean }) => {
  return useAppQuery(
    photoId ? ['photos', 'ai-result', photoId] : null,
    async (): Promise<PhotoAIResult | null> => {
      try {
        const resp = await api.admin["photo-ai-result"][":photoId"].$get({
          param: { photoId }
        });
        
        if (!resp.ok) {
           const text = await resp.text();
           throw new Error(`[HTTP ${resp.status}] ${text.substring(0, 50)}`);
        }

        const data = await resp.json() as Record<string, unknown>;
        if (!data.success) {
          throw new Error((data.error as string) || 'AI Analysis Failed');
        }
        return data.data as PhotoAIResult;
      } catch (err: unknown) {
        throw ErrorFactory.wrap(err, 'Network Error', photoId);
      }
    },
    { 
      staleTime: STALE_TIMES.PHOTO_LIST,
      enabled: options?.enabled
    }
  );
};
