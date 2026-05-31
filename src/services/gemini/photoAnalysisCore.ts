import { Category, Tag, Manufacturer, Dimension } from '../../types';
import { normalizeTagIds } from '@/lib/ai/aiNormalizer';
import { api } from '@/lib/api';
import { AI_CONFIG } from '../../constants/config';
import { AI_PROMPTS } from '../../constants/ai';
import { extractJsonObject } from '../../lib/aiParsing';
import { convertToJpegAndResize } from './imageProcessor';
import { normalizeDimensions } from './dimensionNormalizer';
import { translateDescription } from './translationCore';
import { cleanObject } from '../utils';
import { StandardError } from '@/lib/validators/protocol';

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

  let modelName = customModel || 'Gemini 2.5 Flash Lite Preview 09-2025';
  
  if (!modelName.includes('/')) {
     modelName = 'google/' + modelName;
  }
  
  let processedBase64Image = base64Image;
  try {
     processedBase64Image = await convertToJpegAndResize(base64Image, 1000, signal);
  } catch (e) {
     const message = e instanceof Error ? e.message : String(e)
     throw new StandardError(message, { 
       originalError: e,
       aiDebugHint: `[analyzeProductPhoto/preprocessing] 底層異常: Image preprocessing failed - ${message}` 
     });
  }

  const categoriesJson = (categories || []).map(c => ({
    id: c.id, 
    name: c.name || ''
  }));
  const tagsJson = JSON.stringify((tags || []).map(t => ({ id: t.id, name: t.name })));
  const categoryContext = targetCategoryId
    ? `【强制要求】系统已预设分类为: ${(categories || []).find(c => String(c.id) === String(targetCategoryId))?.name} (id: ${targetCategoryId})`
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
    let fetchResponse: Response;

    if (isProxy) {
      fetchResponse = await api.ai.analyze.$post({
        json: {
          base64Image: processedBase64Image,
          promptText,
          customModel: modelName,
        }
      }, { signal: combinedSignal }) as any;
    } else {
      fetchResponse = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
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
        }),
        signal: combinedSignal
      });
    }

    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      let errorData: any;
      try {
        errorData = await fetchResponse.json();
      } catch (e) {
        errorData = await fetchResponse.text();
      }
      
      const serverMessage = errorData?.error?.message || errorData?.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
      const detailedMessage = `HTTP ${fetchResponse.status}: ${serverMessage}`;
      
      const detailedError = new Error(detailedMessage);
      (detailedError as any).status = fetchResponse.status;
      (detailedError as any).url = fetchUrl;
      (detailedError as any).response = { data: errorData };
      
      throw Object.assign(new StandardError(detailedError.message, { aiDebugHint: `[analyzeProductPhoto/fetch] 底層異常: HTTP ${fetchResponse.status}` }), detailedError);
    }

    const data = await fetchResponse.json();
    const textOutput = data.choices[0]?.message?.content;
    
    if (!textOutput) {
      throw new StandardError(`AI 未回传分析结果`, { aiDebugHint: '[analyzeProductPhoto/fetch] 空結果' });
    }

    const parsedData = extractJsonObject(textOutput);
    if (!parsedData) {
      console.error("AI parse failed. Content:", textOutput);
      throw new StandardError(`回传格式错误，找不到有效的 JSON 对象。AI 回传前120字: "${textOutput.slice(0, 120)}..."`, { aiDebugHint: '[analyzeProductPhoto/parse] JSON 解析失敗' });
    }

    // --- Added compatibility handling for multi-item response ---
    let finalProcessedData = parsedData;
    if (parsedData.items && Array.isArray(parsedData.items) && parsedData.items.length > 0) {
        // Take the first item as the main product
        finalProcessedData = parsedData.items[0];
        
        // If there are other items, append their model number/dimension info into the main product to avoid losing info
        if (parsedData.items.length > 1) {
            const extraInfo = parsedData.items.slice(1).map((item: any, index: number) => {
                return `【其他型号${index + 1}】型号: ${item.modelNumber || item.model || 'N/A'}, 尺寸: ${item.dimensions ? JSON.stringify(item.dimensions) : 'N/A'}`;
            }).join('\n');
            
            finalProcessedData.description = `${finalProcessedData.description || ''}\n\n附加信息:\n${extraInfo}`;
        }
    }
    const dataToProcess = finalProcessedData;
    // -------------------------------------------------------------
    
    // Normalize camelCase properties from AI to snake_case
    if (dataToProcess.categoryId && !dataToProcess.category_id) {
      dataToProcess.category_id = dataToProcess.categoryId;
    }
    if (dataToProcess.tagIds && !dataToProcess.tag_ids) {
      dataToProcess.tag_ids = dataToProcess.tagIds;
    }
    if (dataToProcess.newTags && !dataToProcess.new_tags) {
      dataToProcess.new_tags = dataToProcess.newTags;
    }
    if (dataToProcess.modelNumber && !dataToProcess.model_number) {
      dataToProcess.model_number = dataToProcess.modelNumber;
    }
    
    dataToProcess.description = dataToProcess.description || '';
    dataToProcess.manual_code = null;

    let safeDims: Dimension[] = [];
    if (Array.isArray(dataToProcess.dimensions)) {
      safeDims = dataToProcess.dimensions as Dimension[];
    } else if (dataToProcess.dimensions && typeof dataToProcess.dimensions === 'object') {
      safeDims = [dataToProcess.dimensions] as unknown as Dimension[];
    }
    
    dataToProcess.dimensions = normalizeDimensions(safeDims);
    dataToProcess.tag_ids = normalizeTagIds(dataToProcess.tag_ids || dataToProcess.tagIds, tags || []);

    let resolvedCategoryId: string | null = null;
    const catIdToCheck = String(dataToProcess.category_id || '').trim();
    if (catIdToCheck) {
      // 1. Exact or case-insensitive match
      let match = (categories || []).find(c => 
        String(c.id) === catIdToCheck || 
        String(c.name || '').toLowerCase() === catIdToCheck.toLowerCase()
      );
      
      // 2. Fuzzy match: check if the AI output contains the category name or vice versa
      if (!match) {
        match = (categories || []).find(c => {
          const name = String(c.name || '').toLowerCase().trim();
          const checkNormalized = catIdToCheck.toLowerCase();
          return (name && (checkNormalized.includes(name) || name.includes(checkNormalized)));
        });
      }
      
      if (match) {
        resolvedCategoryId = match.id;
      }
    }
    
    if (!resolvedCategoryId && targetCategoryId) {
      const match = (categories || []).find(c => String(c.id) === String(targetCategoryId));
      if (match) {
        resolvedCategoryId = match.id;
      }
    }
    dataToProcess.category_id = resolvedCategoryId;

    // Get active category for checking redundancies
    const activeCat = (categories || []).find(c => String(c.id) === String(resolvedCategoryId));
    const catWords = new Set<string>();
    if (activeCat) {
      [activeCat.name, activeCat.code]
        .filter(Boolean)
        .forEach(val => {
          catWords.add(String(val).toLowerCase().trim());
        });
    }

    // Check if the category is or includes "chair"
    const isChairCategory = Array.from(catWords).some(word => 
      word.includes('chair') || word.includes('椅') || word.includes('椅子')
    );
    if (isChairCategory) {
      catWords.add('chair');
      catWords.add('chairs');
      catWords.add('椅子');
      catWords.add('椅');
    }

    const containsChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str);

    const isRedundantTag = (tagName: string) => {
      const cleanTagName = tagName.toLowerCase().trim();
      if (containsChinese(cleanTagName)) return true;
      if (catWords.has(cleanTagName)) return true;
      if (isChairCategory && (cleanTagName === 'chair' || cleanTagName === 'chairs' || cleanTagName === '椅子' || cleanTagName === '椅')) {
        return true;
      }
      return false;
    };

    let newTagList: string[] = [];
    if (Array.isArray(dataToProcess.new_tags)) {
      newTagList = dataToProcess.new_tags
        .map((s: any) => String(s).trim())
        .filter((s: any) => s && !containsChinese(s));
    }

    // Filter redundant tagIds (existing tags) and new tags
    let currentTagIds = (dataToProcess.tag_ids || dataToProcess.tagIds || []).filter((tid: string) => {
      const tObj = (tags || []).find(t => String(t.id) === String(tid));
      if (!tObj) return true;
      if (isRedundantTag(tObj.name)) return false;
      if (Array.isArray(tObj.aliases)) {
        if (tObj.aliases.some(alias => isRedundantTag(alias))) {
          return false;
        }
      }
      return true;
    });

    newTagList = newTagList.filter((newTagName: string) => {
      return !isRedundantTag(newTagName);
    });

    if (currentTagIds.length + newTagList.length > 3) {
      if (currentTagIds.length >= 3) {
        currentTagIds = currentTagIds.slice(0, 3);
        newTagList = [];
      } else {
        const needed = 3 - currentTagIds.length;
        newTagList = newTagList.slice(0, needed);
      }
    }
    
    dataToProcess.tag_ids = currentTagIds;
    dataToProcess.new_tags = Array.from(new Set(newTagList));
    dataToProcess._aiModelUsed = modelName;
    return dataToProcess;

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

    throw new StandardError(`AI_FAIL|${status}|${errorMsg}`, {
      originalError: error,
      aiDebugHint: `[analyzeProductPhoto] 底層異常: status=${status} url=${url}`
    });
  }
};
