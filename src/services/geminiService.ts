import { Category, Tag } from '../types';
import { normalizeTagIds } from '../utils/aiNormalizer';
import { AI_CONFIG } from '../constants/config';
import { AI_PROMPTS } from '../constants/ai';
import { extractJsonObject } from '../lib/aiParsing';

const convertToJpegAndResize = async (imageBase: string, maxWidth: number = 1000): Promise<string> => {
  return new Promise((resolve, reject) => {
    // We can canvas-convert data:, blob:, or http(s): (if CORS allows).
    // Let's at least try for anything that looks local.
    if (!imageBase.startsWith('data:') && !imageBase.startsWith('blob:') && !imageBase.startsWith('http')) {
      resolve(imageBase);
      return;
    }

    const img = new Image();
    // To avoid tainted canvas, if it's external, we need crossOrigin.
    if (imageBase.startsWith('http')) {
        img.crossOrigin = 'Anonymous';
    }
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageBase); // Fallback
        return;
      }
      // Fill white background in case of transparency
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        // Force JPEG conversion
        const jpegBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(jpegBase64);
      } catch (e) {
        console.warn('Canvas toDataURL failed (likely CORS taint):', e);
        resolve(imageBase); // fallback
      }
    };
    img.onerror = () => {
        console.error('Image load failed for conversion.');
        reject(new Error('Image conversion failed'));
    };
    img.src = imageBase;
  });
};

export const analyzeProductPhoto = async (
  base64Image: string,
  categories: any[], 
  tags: Tag[],
  manufacturers: any[], 
  customApiKey?: string,
  provider: string = 'auto',
  customModel?: string,
  targetCategoryId?: string | null,
  originalName?: string | null,
  signal?: AbortSignal
) => {
  // Determine if we use local proxy or direct OpenRouter
  const isProxy = !customApiKey;
  const apiKey = customApiKey; // Only direct key if provided

  // Strictly read from configuration, NO defaults allowed
  let modelName = customModel;
  
  if (!modelName) {
    throw new Error('请在设置中配置 AI 模型 (Model Name)');
  }
  
  // Ensure the model name includes the provider prefix if needed
  if (!modelName.includes('/')) {
     modelName = 'google/' + modelName;
  }
  
  // Convert WebP / large images to optimal JPEG
  let processedBase64Image = base64Image;
  try {
     processedBase64Image = await convertToJpegAndResize(base64Image, 1000);
  } catch (e) {
     console.warn('Image conversion failed, falling back to original image', e);
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

    const requestBody = {
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

    const fetchUrl = apiKey === process.env.GEMINI_API_KEY || !apiKey 
      ? '/api/ai/analyze' 
      : 'https://openrouter.ai/api/v1/chat/completions';
    
    // Internal timeout to prevent hangs
    const timeoutAbort = new AbortController();
    const timeoutId = setTimeout(() => timeoutAbort.abort(), AI_CONFIG.TIMEOUT);
    
    // Combine signals if necessary
    let combinedSignal;
    if (typeof (AbortSignal as any).any === 'function') {
      combinedSignal = (AbortSignal as any).any([signal, timeoutAbort.signal].filter(Boolean));
    } else {
      combinedSignal = signal || timeoutAbort.signal;
    }

    const isProxy = fetchUrl.startsWith('/api/');
    
    if (!isProxy) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = window.location.href;
      headers['X-Title'] = 'Product Cataloger AI';
    }

    const payload = isProxy ? {
      base64Image: processedBase64Image,
      promptText,
      customModel: modelName,
      // Pass other context if needed
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
    
    // description_translations initialization
    const zh = parsedData.description || '';
    parsedData.description_translations = { 
      zh: zh, 
      en: '', 
      ms: '' 
    };
    parsedData.description = zh;
    
    // AI MUST NOT fill manualCode, manual control only
    parsedData.manualCode = null;

    // Normalize dimensions: Always an array
    let safeDims: any[] = [];
    if (Array.isArray(parsedData.dimensions)) {
      safeDims = parsedData.dimensions;
    } else if (parsedData.dimensions && typeof parsedData.dimensions === 'object') {
      safeDims = [parsedData.dimensions];
    }
    
    // Clean and normalize dimensions based on new rules
    parsedData.dimensions = normalizeDimensions(safeDims);

    // Normalize tagIds to always be an array of strings
    parsedData.tagIds = normalizeTagIds(parsedData.tagIds);

    // Normalize newTags to always be an array of strings
    let newTagList: string[] = [];
    if (Array.isArray(parsedData.newTags)) {
      newTagList = parsedData.newTags.map(s => String(s).trim()).filter(Boolean);
    }

    // Total tags enforcement: Ensure we have exactly 3 tags
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
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("GeminiService API Error:", error);
    const status = error.status || error.response?.status || 500;
    const url = error.url || 'unknown';
    
    // Attempt to stringify the error object if it's not just a string, to give more context
    let errorDetail = '';
    try {
        errorDetail = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
    } catch {
        errorDetail = String(error);
    }

    // Safely extract the most descriptive error message possible
    let errorMsg = error.message || '';
    
    if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
    } else if (error.error?.message) {
        errorMsg = error.error.message;
    }

    if (!errorMsg || errorMsg.trim() === '') {
        errorMsg = `API 请求发送失败 (status: ${status}, url: ${url})。详细错误: ${errorDetail.slice(0, 500)}`;
    }
    
    // Check if body is plain text or json
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('does not have permission')) {
        errorMsg = "API Key 没有权限、遭停权，或是此地区被封锁: " + error.response.data;
    }

    // Direct debug alerting as requested by user
    console.error('AI API 错误详情:\n' + JSON.stringify({ 
        status: status, 
        message: errorMsg,
        errorRaw: error 
    }, null, 2));

    throw new Error(`AI_FAIL|${status}|${errorMsg}`);
  }
};

/**
 * AI Recognition Dimensions Automatic Cleaning Function
 * Ensures length/width/height fields are preserved and data is clean.
 */
export const normalizeDimensions = (dims: any[]): any[] => {
  if (!Array.isArray(dims) || dims.length === 0) return [];

  const rawProcessed = dims
    .map(d => {
      if (!d) return null;
      const originalLabel = typeof d === 'string' ? d : String(d.label || '');
      
      let length = 0;
      let width = 0;
      let height = 0;

      // Handle part name separation (e.g. "WD: H..." -> parse dimensions from "H...")
      let parsingPart = originalLabel;
      const partPrefixMatch = originalLabel.match(/^([A-Z]+):\s*(.*)/);
      if (partPrefixMatch) {
        parsingPart = partPrefixMatch[2];
      }

      // Helper to strip non-numeric/non-decimal characters just in case
      const cleanNum = (s: string) => {
          const match = s.match(/(\d+(\.\d+)?)/);
          return match ? parseFloat(match[1]) : 0;
      };

      const nums = parsingPart.match(/(\d+(\.\d+)?)/g) || [];
      const hasH = /H/i.test(parsingPart);
      const hasW = /W/i.test(parsingPart);
      const hasD = /D/i.test(parsingPart);
      const hasL = /L/i.test(parsingPart);

      if (hasH || hasW || hasD || hasL) {
        // 1️⃣ Strict identification by labels (H/W/D/L)
        const hMatch = parsingPart.match(/H\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const wMatch = parsingPart.match(/W\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const lMatch = parsingPart.match(/L\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const dMatch = parsingPart.match(/D\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);

        if (hMatch) height = parseFloat(hMatch[1]);
        
        if (wMatch && lMatch) {
          width = parseFloat(wMatch[1]);
          length = parseFloat(lMatch[1]);
        } else if (wMatch) {
          width = parseFloat(wMatch[1]);
        } else if (lMatch) {
          length = parseFloat(lMatch[1]);
        }

        if (dMatch) {
          const depthVal = parseFloat(dMatch[1]);
          if (length === 0) length = depthVal;
          else if (width === 0) width = depthVal;
        }
      } else if (nums.length > 0) {
        // 2️⃣ Pattern fallback: height -> length -> width
        height = parseFloat(nums[0]);
        if (nums.length >= 2) length = parseFloat(nums[1]);
        if (nums.length >= 3) width = parseFloat(nums[2]);
      }
      
      // Clean label: remove Chinese, common unit labels, symbols.
      const cleanedLabel = originalLabel.replace(/[\u4e00-\u9fa5]+/g, '')
                                       .replace(/(cm|mm|inch|in|寸|["'”])/gi, '')
                                       .trim();

      return { 
        ...d, 
        label: cleanedLabel,
        unit: d.unit === 'inch' ? 'inch' : 'cm',
        length,
        width,
        height,
        isAI: true
      };
    })
    .filter(Boolean) as any[];

  // Heuristic Merge: Combine sequential dimension objects that describe components of a single set
  const merged: any[] = [];
  let current: any = null;

  for (const d of rawProcessed) {
    if (!current) {
      current = { ...d };
    } else {
      // Logic for merging: 
      // 1. Both objects must be "incomplete" (at least one H/W/L is 0)
      // 2. They must not have overlapping H/W/L values (unless both are 0)
      const hasOverlap = 
        (d.height > 0 && current.height > 0) ||
        (d.width > 0 && current.width > 0) ||
        (d.length > 0 && current.length > 0);
      
      const bothAreIncomplete = 
        (current.height === 0 || current.width === 0 || current.length === 0) &&
        (d.height === 0 || d.width === 0 || d.length === 0);

      // Label check: if one object looks like a single component label (e.g., "H855") 
      // or the other is nearby in the array, it's a strong merge signal.
      const isSimpleLabel = (s: string) => /^(H|W|D|L|Height|Width|Depth|Length)\s*[:：]?\s*\d+(\.\d+)?\s*(cm|mm|inch|in|")?$/i.test(s.trim());

      // Component count: how many of H, W, L are filled (>0)
      const currentFillCount = (current.height > 0 ? 1 : 0) + (current.width > 0 ? 1 : 0) + (current.length > 0 ? 1 : 0);
      const nextFillCount = (d.height > 0 ? 1 : 0) + (d.width > 0 ? 1 : 0) + (d.length > 0 ? 1 : 0);

      const shouldMerge = !hasOverlap && bothAreIncomplete && (
        isSimpleLabel(d.label) || 
        isSimpleLabel(current.label) || 
        // Or if both are very incomplete (only 1 or 2 fields filled each)
        (currentFillCount + nextFillCount <= 3)
      );

      if (shouldMerge) {
        if (d.height > 0) current.height = d.height;
        if (d.width > 0) current.width = d.width;
        if (d.length > 0) current.length = d.length;
        // Smart label: don't repeat the same thing if labels are similar
        if (current.label && d.label && !current.label.includes(d.label)) {
          current.label = `${current.label} ${d.label}`.trim();
        } else if (!current.label) {
          current.label = d.label;
        }
        if (d.unit === 'inch') current.unit = 'inch';
      } else {
        merged.push(current);
        current = { ...d };
      }
    }
  }
  if (current) merged.push(current);
  
  return merged;
};

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

    if (!response.ok) throw new Error(`翻译失败: ${response.statusText}`);
    
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

export const testAiConnection = async (apiKey: string, provider: string, customModel?: string) => {
  try {
    // Very minimal payload to test the key
    await analyzeProductPhoto(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAAAgAB35oT2AAAAABJRU5ErkJggg==',
      [],
      [],
      [],
      apiKey,
      provider,
      customModel
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
