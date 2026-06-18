import { STALE_TIMES } from '@/lib/query/config';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PhotoAIResult } from '@/types';

/**
 * 获取照片对应的 AI 识别原始源代碼與解析後的 JSON 數據。
 */
export const usePhotoAIResult = (photoId: string) => {
  return useQuery({
    queryKey: ['photos', 'ai-result', photoId],
    queryFn: async (): Promise<PhotoAIResult | null> => {
      const resp = await api.admin["photo-ai-result"][":photoId"].$get({
        param: { photoId }
      });
      const data = await resp.json() as any;
      if (!data.success) {
        throw new Error(data.error || '获取 AI 识别源数据失败');
      }
      return data.data;
    },
    enabled: !!photoId,
    staleTime: STALE_TIMES.PHOTO_LIST
  });
};
