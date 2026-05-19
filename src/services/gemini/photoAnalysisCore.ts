import { Category, Tag, Manufacturer, Dimension } from '../../types';
import { normalizeTagIds } from '../../utils/aiNormalizer';
import { AI_CONFIG } from '../../constants/config';
import { AI_PROMPTS } from '../../constants/ai';
import { extractJsonObject } from '../../lib/aiParsing';
import { convertToJpegAndResize } from './imageProcessor';
import { normalizeDimensions } from './dimensionNormalizer';
import { translateDescription } from './translationCore';
import { cleanObject } from '../utils';

export const analyzeProductPhoto = async (
  base64Image: string,
  categories: Category[], 
  tags: Tag[],
  manufacturers: Manufacturer[], 
  customApiKey?: string,
  provider: string = 'auto',
  customModel?: string,
  targetCategoryId?: string | null,
  originalName?: string | null,
  signal?: AbortSignal
) => {
  const apiKey = customApiKey;

  let modelName = customModel;
  if (!modelName) {
    throw new Error('请在设置中配置 AI 模型 (Model Name)');
  }
  
  if (!modelName.includes('/')) {
     modelName = 'google/' + modelName;
  }
  
  let processedBase64Image = base64Image;
  try {
     processedBase64Image = await convertToJpegAndResize(base64Image, 1000);
  } catch (e) {
     console.debug('Image conversion failed, falling back to original image');
  }

  const categoriesJson = (categories || []).map(c => ({
    id: c.id, 
    name: c.zh || c.name || ''
  }));
  const tagsJson = JSON.stringify((tags || []).map(t => ({ id: t.id, name: t.name })));
  const categoryContext = targetCategoryId
    ? `【强制要求】系统已预设分类为: ${(categories || []).find(c => String(c.id) === String(targetCategoryId))?.zh || (categories || []).find(c => String(c.id) === String(targetCategoryId))?.name} (id: ${targetCategoryId})`
    : "请从清单选择最合适的分类. 已有分类列表: " + JSON.stringify(categoriesJson);

  const promptText = AI_PROMPTS.ANALYZE_PRODUCT(categoryContext, tagsJson);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'Product Cataloger AI',
    };

    const fetchUrl = !apiKey 
      ? '/api/ai/analyze' 
      : 'https://openrouter.ai/api/v1/chat/completions';
    
    const timeoutAbort = new AbortController();
    const timeoutId = setTimeout(() => timeoutAbort.abort(), AI_CONFIG.TIMEOUT);
    
    let combinedSignal;
    if (typeof (AbortSignal as any).any === 'function') {
      combinedSignal = (AbortSignal as any).any([signal, timeoutAbort.signal].filter(Boolean));
    } else {
      combinedSignal = signal || timeoutAbort.signal;
    }

    const isProxy = fetchUrl.startsWith('/api/');
    
    const payload = isProxy ? {
      base64Image: processedBase64Image,
      promptText,
      customModel: modelName,
    } : {
      model: modelName.replace('openrouter/', ''),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: { url: processedBase64Image }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    };

    const fetchResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: combinedSignal
    });

    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      let errorData;
      try {
        errorData = await fetchResponse.json();
      } catch (e) {
        errorData = await fetchResponse.text();
      }
      throw { status: fetchResponse.status, url: fetchUrl, response: { data: errorData }, message: JSON.stringify(errorData) };
    }

    const data = await fetchResponse.json();
    const textOutput = data.choices[0]?.message?.content;
    
    if (!textOutput) {
      throw new Error(`AI 未回传分析结果`);
    }

    const parsedData = extractJsonObject(textOutput);
    if (!parsedData) {
      throw new Error('回传格式错误，找不到有效的 JSON 对象');
    }
    
    const zh = parsedData.description || '';
    parsedData.description_translations = { zh, en: '', ms: '' };
    parsedData.description = zh;
    parsedData.manualCode = null;

    let safeDims: Dimension[] = [];
    if (Array.isArray(parsedData.dimensions)) {
      safeDims = parsedData.dimensions as Dimension[];
    } else if (parsedData.dimensions && typeof parsedData.dimensions === 'object') {
      safeDims = [parsedData.dimensions] as unknown as Dimension[];
    }
    
    parsedData.dimensions = normalizeDimensions(safeDims);
    parsedData.tagIds = normalizeTagIds(parsedData.tagIds);

    let newTagList: string[] = [];
    if (Array.isArray(parsedData.newTags)) {
      newTagList = parsedData.newTags.map(s => String(s).trim()).filter(Boolean);
    }

    let currentTagIds = parsedData.tagIds;
    if (currentTagIds.length + newTagList.length > 3) {
      if (currentTagIds.length >= 3) {
        currentTagIds = currentTagIds.slice(0, 3);
        newTagList = [];
      } else {
        const needed = 3 - currentTagIds.length;
        newTagList = newTagList.slice(0, needed);
      }
    }
    
    parsedData.tagIds = currentTagIds;
    parsedData.newTags = Array.from(new Set(newTagList));
    parsedData._aiModelUsed = modelName;
    return parsedData;
  } catch (error: unknown) {
    if ((error as Error).name === 'AbortError') throw error;
    console.error("GeminiService API Error:", error);
    const errObj = error as any;
    const status = errObj.status || errObj.response?.status || 500;
    const url = errObj.url || 'unknown';
    
    let errorDetail = '';
    try {
        errorDetail = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
    } catch {
        errorDetail = String(error);
    }

    let errorMsg = errObj.message || '';
    if (errObj.response?.data?.error?.message) {
        errorMsg = errObj.response.data.error.message;
    } else if (errObj.error?.message) {
        errorMsg = errObj.error.message;
    }

    if (!errorMsg || errorMsg.trim() === '') {
        errorMsg = `API 请求发送失败 (status: ${status}, url: ${url})。详细错误: ${errorDetail.slice(0, 500)}`;
    }
    
    if (status === 404 && url.startsWith('/api/')) {
        errorMsg = "AI API 代理未启动或不支持此部署环境 (如 Vercel Static)。请在「设置」中手动填写您的 API Key 以绕过服务器代理。";
    }

    if (errObj.response?.data && typeof errObj.response.data === 'string' && errObj.response.data.includes('does not have permission')) {
        errorMsg = "API Key 没有权限、遭停权，或是此地区被封锁: " + errObj.response.data;
    }

    throw new Error(`AI_FAIL|${status}|${errorMsg}`);
  }
};
