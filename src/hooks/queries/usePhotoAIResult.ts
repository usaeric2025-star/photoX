import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PhotoAIResult } from '@/types';

/**
 * AI Result Query Hook.
 * Manages the fetching and caching of AI analysis results for photos.
 */
export const usePhotoAIResult = (photoId?: string) => {
  return useQuery<PhotoAIResult | null>({
    queryKey: ['photos', 'ai-result', photoId],
    queryFn: async () => {
      if (!photoId) return null;
      const { data, error } = await supabase
        .from('photo_ai_results')
        .select('*')
        .eq('photo_id', photoId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!photoId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
