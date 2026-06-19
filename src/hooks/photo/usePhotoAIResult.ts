import { STALE_TIMES } from '@/lib/query/config';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PhotoAIResult } from '@/types';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

/**
 * 获取照片对应的 AI 识别原始源代碼與解析後的 JSON 數據。
 */
export const usePhotoAIResult = (photoId: string) => {
  return useQuery({
    queryKey: ['photos', 'ai-result', photoId],
    queryFn: async (): Promise<PhotoAIResult | null> => {
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
          throw new Error((data.error as string) || '获取 AI 识别源数据失败');
        }
        return data.data as PhotoAIResult;
      } catch (err: unknown) {
        throw ErrorFactory.wrap(err, '获取 AI 源数据网络异常', photoId);
      }
    },
    enabled: !!photoId,
    staleTime: STALE_TIMES.PHOTO_LIST
  });
};
