import { api } from '@/lib/api';
import { Photo } from '../types';
import { analyzeProductPhoto } from './gemini';
import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { ok, err, AppResult } from '@/lib/errorFactory';
import { ErrorFactory } from '../lib/error/ErrorFactory';

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
       return err(data.error || 'AI 分析失败');
     }
  } catch (e: any) {
    if (e.name === 'AbortError') return err('请求已取消');
    return err(e.message || 'AI 分析异常', 'UNKNOWN');
  }
};
