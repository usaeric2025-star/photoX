import { AI_PROMPTS } from '../../constants/ai';
import { extractJsonObject } from '../../lib/aiParsing';

export const translateDescription = async (
  zhText: string,
  apiKey: string,
  customModel?: string,
  signal?: AbortSignal
): Promise<{ en: string; ms: string }> => {
  const modelName = customModel;
  if (!modelName) throw new Error('请在设置中配置 AI 模型 (Model Name)');

  const isProxy = !apiKey;
  const prompt = AI_PROMPTS.TRANSLATE_DESCRIPTION(zhText);
  const fetchUrl = isProxy ? '/api/ai/translate' : 'https://openrouter.ai/api/v1/chat/completions';

  try {
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(isProxy ? {} : { 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': window.location.origin }),
      },
      body: JSON.stringify(isProxy ? {
        promptText: prompt,
        customModel: modelName
      } : {
        model: modelName.includes('/') ? modelName : `google/${modelName}`,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1024
      }),
      signal
    });

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
