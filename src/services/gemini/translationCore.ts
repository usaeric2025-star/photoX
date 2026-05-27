import { AI_PROMPTS } from '../../constants/ai';
import { extractJsonObject } from '../../lib/aiParsing';
import { api } from '@/lib/api';

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
          throw new Error("部署环境不支持代理，请在设置中配置 API Key");
       }
       throw new Error(`翻译失败: ${response.statusText}`);
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
