import { api } from '@/lib/api';
import { extractJsonObject } from '@/lib/aiParsing';

export interface AgnesDimensions {
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
}

export interface AgnesTranslations {
  zh: string;
  en: string;
  ms: string;
}

/**
 * Translate text into Chinese, English and Malay
 */
export const translateText = async (text: string, signal?: AbortSignal): Promise<AgnesTranslations> => {
    if (!text || text.trim() === '') return { zh: '', en: '', ms: '' };

    const prompt = `You are Agnes, a professional translator for home furniture. 
The input text below is a product name or description in Chinese.
Please translate it into two versions: English (EN) and Bahasa Melayu (MS).

Input: "${text}"

Output strictly in JSON format:
{
  "en": "...",
  "ms": "..."
}`;

    try {
      const response = await api.ai.run.$post({
        json: {
          task: 'text_chat',
          prompt
        }
      }, { signal }) as any;

      if (!response.ok) throw new Error('Agnes translation request failed');
      
      const result = await response.json();
      const content = result.content;
      const parsed = extractJsonObject(content);
      
      return {
        zh: text,
        en: parsed?.en || text,
        ms: parsed?.ms || text
      };
    } catch (err) {
      console.warn('[AgnesService] Translation failed, using fallback:', err);
      return { zh: text, en: text, ms: text };
    }
};

/**
 * Extract dimensions from text (Preserve values, no conversion)
 */
export const extractDimensions = async (text: string, signal?: AbortSignal): Promise<AgnesDimensions> => {
    if (!text || text.trim() === '') return { width_cm: null, height_cm: null, depth_cm: null };

    const prompt = `You are Agnes, a data analyst. Extract physical dimensions from the following text. 
Identify width, height, and depth (depth can be depth, length, or thick). 
CRITICAL RULE: DO NOT CONVERT UNITS. If the text says "26 inch", output 26.

Input: "${text}"

Output strictly in JSON format:
{
  "width_cm": number | null,
  "height_cm": number | null,
  "depth_cm": number | null
}`;

    try {
      const response = await api.ai.run.$post({
        json: {
          task: 'text_chat',
          prompt
        }
      }, { signal }) as any;

      if (!response.ok) throw new Error('Agnes extraction request failed');
      
      const result = await response.json();
      const content = result.content;
      const parsed = extractJsonObject(content);
      
      return {
        width_cm: parsed?.width_cm ?? null,
        height_cm: parsed?.height_cm ?? null,
        depth_cm: parsed?.depth_cm ?? null
      };
    } catch (err) {
      console.warn('[AgnesService] Dimension extraction failed:', err);
      return { width_cm: null, height_cm: null, depth_cm: null };
    }
};
