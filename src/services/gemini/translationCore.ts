import { AI_PROMPTS } from '../../constants/ai';
import { extractJsonObject } from '../../lib/aiParsing';
import { api } from '@/lib/api';
import { DEFAULT_AI_MODEL } from '@/config/ai';
import { ErrorFactory } from '../../lib/error/ErrorFactory';

export const translateDescription = async (
  zhText: string,
  apiKey: string,
  customModel?: string,
  signal?: AbortSignal
): Promise<{ en: string; ms: string }> => {
  const modelName = customModel || 'Gemini 2.5 Flash Lite Preview 09-2025';

  const isProxy = !apiKey;
  const prompt = AI_PROMPTS.TRANSLATE_DESCRIPTION(zhText);
  const fetchUrl = isProxy ? '/api/ai/translate' : 'https://openrouter.ai/api/v1/chat/completions';

  try {
    let response: Response;
    if (isProxy) {
      response = await api.ai.translate.$post({
        json: {
          promptText: prompt,
          customModel: modelName
        }
      }, { signal }) as any;
    } else {
      response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`, 
          'HTTP-Referer': window.location.origin
        },
        body: JSON.stringify({
          model: modelName.includes('/') ? modelName : `google/${modelName}`,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 1024
        }),
        signal
      });
    }

    if (!response.ok) {
       if (response.status === 404 && fetchUrl.startsWith('/api/')) {
          throw ErrorFactory.wrap(new Error("部署环境不支持代理，请在设置中配置 API Key"), 'translateDescription');
       }
       throw ErrorFactory.wrap(new Error(`翻译失败: ${response.statusText}`), 'translateDescription');
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { en: '', ms: '' };

    const parsed = extractJsonObject(content);
    if (!parsed) return { en: '', ms: '' };
    
    return {
      en: parsed.en || '',
      ms: parsed.ms || ''
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    console.error("Translation error:", err);
    return { en: '', ms: '' };
  }
};

export async function translateProductFields(
  fields: {
    name?: string;
    description?: string;
    category?: string;
    colors?: string[];
    materials?: string[];
  },
  apiKey?: string,
  customModel?: string,
  signal?: AbortSignal
): Promise<{
  name_en: string;
  name_ms: string;
  description_en: string;
  description_ms: string;
  colors_en: string[];
  colors_ms: string[];
  materials_en: string[];
  materials_ms: string[];
}> {
  const result = {
    name_en: '',
    name_ms: '',
    description_en: '',
    description_ms: '',
    colors_en: [] as string[],
    colors_ms: [] as string[],
    materials_en: [] as string[],
    materials_ms: [] as string[]
  };

  if (!fields.name && !fields.description && !fields.category && (!fields.colors || fields.colors.length === 0) && (!fields.materials || fields.materials.length === 0)) {
    return result;
  }

  const prompt = `You are a professional translator. Translate the following product details into English and Bahasa Melayu (Malay).
Input details:
${fields.name ? `- NAME: "${fields.name}"` : ''}
${fields.description ? `- DESCRIPTION: "${fields.description}"` : ''}
${fields.category ? `- CATEGORY: "${fields.category}"` : ''}
${fields.colors && fields.colors.length > 0 ? `- COLORS: ${JSON.stringify(fields.colors)}` : ''}
${fields.materials && fields.materials.length > 0 ? `- MATERIALS: ${JSON.stringify(fields.materials)}` : ''}

【CRITICAL RULES】
1. Translate accurately and professionally.
2. Maintain brand names and terminology if applicable.
3. Keep the same array indexes and sizes for COLORS and MATERIALS.
4. Output raw JSON object without markdown formatting.

Your response MUST match this exact JSON schema:
{
  "name_en": "translated english name",
  "name_ms": "translated malay name",
  "description_en": "translated english description",
  "description_ms": "translated malay description",
  "colors_en": ["color1_en", "color2_en", ...],
  "colors_ms": ["color1_malay", "color2_malay", ...],
  "materials_en": ["material1_en", "material2_en", ...],
  "materials_ms": ["material1_malay", "material2_malay", ...]
}`;

  const isProxy = !apiKey;
  const fetchUrl = isProxy ? '/api/ai/translate' : 'https://openrouter.ai/api/v1/chat/completions';
  const modelName = customModel || DEFAULT_AI_MODEL;

  try {
    let response: Response;
    if (isProxy) {
      response = await api.ai.translate.$post({
        json: {
          promptText: prompt,
          customModel: modelName
        }
      }, { signal }) as any;
    } else {
      response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin
        },
        body: JSON.stringify({
          model: modelName.includes('/') ? modelName : `google/${modelName}`,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 1024
        }),
        signal
      });
    }

    if (!response.ok) {
      throw ErrorFactory.wrap(new Error(`Fields translation HTTP error: ${response.statusText}`), 'translateProductFields');
    }

    const resJson = await response.json();
    const content = resJson.choices?.[0]?.message?.content || JSON.stringify(resJson);
    const parsed = extractJsonObject(content);

    if (parsed) {
      result.name_en = parsed.name_en || '';
      result.name_ms = parsed.name_ms || '';
      result.description_en = parsed.description_en || '';
      result.description_ms = parsed.description_ms || '';
      if (Array.isArray(parsed.colors_en)) result.colors_en = parsed.colors_en;
      if (Array.isArray(parsed.colors_ms)) result.colors_ms = parsed.colors_ms;
      if (Array.isArray(parsed.materials_en)) result.materials_en = parsed.materials_en;
      if (Array.isArray(parsed.materials_ms)) result.materials_ms = parsed.materials_ms;
    }
  } catch (err) {
    console.error('[translateProductFields] Non-fatal translation error, using fallbacks:', err);
    result.name_en = fields.name || '';
    result.name_ms = fields.name || '';
    result.description_en = fields.description || '';
    result.description_ms = fields.description || '';
    result.colors_en = fields.colors || [];
    result.colors_ms = fields.colors || [];
    result.materials_en = fields.materials || [];
    result.materials_ms = fields.materials || [];
  }

  return result;
}

