import { api } from '@/lib/api';
import { Photo } from '../../types';
import { analyzeProductPhoto } from '../gemini';
import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { ok, err, ErrorFactory } from '@/lib/error/ErrorFactory';
import { type AppResult } from '@/types/api';

/**
 * [V2.0-SERVICE-SINGLETON] AI Photo Analysis Service
 */
export const analyzePhoto = async (photoId: string, signal?: AbortSignal): Promise<AppResult<any>> => {
  try {
     const resp = await api.ai.analyze.$post({ json: { photoId } }) as any;
     const data = await resp.json();
     if (data.success) {
       return ok(data.data);
     } else {
       let errorMsg = data.error || 'AI 分析失败';
       if (typeof errorMsg === 'string' && errorMsg.startsWith('{')) {
          try {
             const parsed = JSON.parse(errorMsg);
             if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) {
                errorMsg = parsed.error.message;
             } else if (typeof parsed.error === 'string') {
                errorMsg = parsed.error;
             }
          } catch (e) {
             // ignore
          }
       }
       return err(errorMsg);
     }
  } catch (e: any) {
    if (e.name === 'AbortError') return err('请求已取消');
    return err(e.message || 'AI 分析异常', 'UNKNOWN');
  }
};
