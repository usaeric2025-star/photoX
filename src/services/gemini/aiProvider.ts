import { ErrorFactory } from '@/lib/error/ErrorFactory';

export type AIProvider = 'agnes' | 'gemini';

export async function callAIAnalysis(
  prompt: string,
  imageBase64: string | undefined,
  modelName: string,
  apiKey?: string,
  signal?: AbortSignal
) {
  const provider: AIProvider = (localStorage.getItem('AI_PRIMARY_PROVIDER') as AIProvider) || 'agnes';
  
  try {
    if (provider === 'agnes') {
      return await callAgnesAPI(prompt, imageBase64, modelName, signal);
    }
    return await callGeminiAPI(prompt, imageBase64, modelName, apiKey, signal);
  } catch (error) {
    console.warn(`[${provider}] failed, falling back to gemini:`, error);
    return await callGeminiAPI(prompt, imageBase64, modelName, apiKey, signal);
  }
}

async function callAgnesAPI(prompt: string, imageBase64: string | undefined, model: string, signal?: AbortSignal) {
  const response = await fetch('/api/ai/agnes-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageBase64, model }),
    signal
  });
  if (!response.ok) throw new Error(`Agnes API error: ${response.statusText}`);
  const data = await response.json();
  return { choices: [{ message: { content: data.choices[0].message.content } }] };
}

async function callGeminiAPI(prompt: string, imageBase64: string | undefined, model: string, apiKey?: string, signal?: AbortSignal) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': window.location.href,
    'X-Title': 'Product Cataloger AI',
  };

  const fetchUrl = apiKey 
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : '/api/ai/analyze';
    
  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.replace('openrouter/', ''),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    }),
    signal
  });
  
  if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);
  return response.json();
}
