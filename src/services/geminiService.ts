import { Category, Tag } from '../types';
import { normalizeTagIds } from '../utils/aiNormalizer';

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
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('请先在管理设置中设定 AI 密钥');
  }

  // Use OpenRouter endpoint
  const baseURL = 'https://openrouter.ai/api/v1';
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
  const manufacturersJson = (manufacturers || []).map(m => ({ id: m.id, name: m.name }));
  const tagsJson = (tags || []).map(t => ({ id: t.id, name: t.name }));
  const categoryContext = targetCategoryId
    ? `【强制要求】系统已预设分类为: ${(categories || []).find(c => String(c.id) === String(targetCategoryId))?.zh || (categories || []).find(c => String(c.id) === String(targetCategoryId))?.name} (id: ${targetCategoryId})`
    : "请从清单选择最合适的分类";

  const promptText = `You are a furniture product analyzer. Extract data STRICTLY as follows:

【CRITICAL - FIELD SEPARATION】
- "name": ONLY product model or brand name (e.g., "IMCOCO").
- "modelNumber": ONLY SKU/Model code (e.g., "B728").
- "price": ONLY numeric part (e.g., "1200").
- "dimensions": Array of objects with length/width/height (numbers).
- FORBID putting dimensions, model numbers, or price into "name".

【NAME RULES】
- name MUST NOT contain H/W/D, numbers+units (like 53cm), or "x"/×.
- If detected, move those contents to dimensions.
- name should be professional and concise.

【LANGUAGE & DESCRIPTION】
- "description": Generate a professional description in 【简体中文 (Simplified Chinese)】.
- MUST NOT be empty.

【DIMENSIONS RULES】
- Each dimension object MUST include label, length, width, height, unit.
- If label shows H/W/D/L: height = H, width OR length = W/L, depth = D. Assign strictly by labels, ignore item name or number order.
- If label format is "PART: Dimensions" (e.g., "WD: H94 x W96 x D23"): maintain the "PART:" prefix but parse only the dimensions for numeric values.
- If NO H/W/D/L labels: use order height → length → width.
- Default unit = "cm" if missing.

【CATEGORY & TAGS】
- "categoryId": ${categoryContext} Available Categories (id/name): ${JSON.stringify(categoriesJson)}
- "tagIds": Select 2-3 most relevant existing tags (return their IDs): ${JSON.stringify(tagsJson)}
- "newTags": If no existing tag fits, create NEW ones. Rules: UPPERCASE, single English word.

【STRICT PROHIBITIONS】
- DO NOT fill "manualCode". Leave it as null.
- DO NOT invent dimensions. If not visible in photo, return empty array [].
- DO NOT output markdown or extra text. Return ONLY valid JSON.

OUTPUT JSON example:
{
  "name": "IMCOCO",
  "modelNumber": "B728",
  "price": "1200",
  "dimensions": [
    { "label": "H94\" x W96\" x D23\"", "length": 23, "width": 96, "height": 94, "unit": "inch" }
  ],
  "description": "这是一款现代风格的沙发床...",
  "categoryId": "UUID-FROM-LIST or null",
  "tagIds": ["UUID1", "UUID2"],
  "newTags": []
}
`;

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

    const fetchUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Internal timeout to prevent hangs
    const timeoutAbort = new AbortController();
    const timeoutId = setTimeout(() => timeoutAbort.abort(), 45000);
    
    // Combine signals if necessary
    const combinedSignal = signal ? signal : timeoutAbort.signal;

    const fetchResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
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

    // Safely extract JSON in case the model wraps it in markdown blocks or has leading/trailing fluff
    let cleanText = textOutput.trim();
    if (cleanText.includes('```')) {
      const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanText = match[1];
    }
    
    const startIndex = cleanText.indexOf('{');
    const endIndex = cleanText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('回传格式错误，找不到 JSON 对象');
    }
    
    const jsonStr = cleanText.substring(startIndex, endIndex + 1);
    
    // Improved sanitization
    // 1. Remove JavaScript-style comments
    // 2. Remove non-printable control characters
    // 3. Fix trailing commas
    const minimalSanitize = jsonStr
        .replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '') 
        .replace(/[\u0000-\u0019]+/g, "")
        .replace(/,\s*([\]}])/g, '$1')
        .trim();

    let parsedData;
    try {
      parsedData = JSON.parse(minimalSanitize);
    } catch (parseErr) {
      console.error("JSON Parse Error (Minimal):", parseErr, "Content:", minimalSanitize);
      // Fallback: try to fix unescaped line breaks and quotes within values
      try {
          const secondPass = minimalSanitize
            .replace(/\r?\n|\r/g, " ") 
            .replace(/\\(?!"|u|n|r|t|b|f)/g, "\\\\");
          parsedData = JSON.parse(secondPass);
      } catch (e) {
         // Final attempt: aggressive quote escaping for value strings
         try {
           const heuristicFixed = minimalSanitize.replace(/":\s*"(.*?)"(\s*[},])/g, (m, p1, p2) => {
              return `": "${p1.replace(/"/g, '\\"')}"${p2}`;
           });
           parsedData = JSON.parse(heuristicFixed);
         } catch (finalErr) {
           throw new Error(`JSON 解析失败: ${parseErr instanceof Error ? parseErr.message : '解析格式错误'}`);
         }
      }
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

    // Total tags enforcement: Ensure we have exactly 3 tags (ID or New Name)
    let currentTagIds = parsedData.tagIds;
    
    // If we have more than 3 total, trim them down
    if (currentTagIds.length + newTagList.length > 3) {
      if (currentTagIds.length >= 3) {
        currentTagIds = currentTagIds.slice(0, 3);
        newTagList = [];
      } else {
        // currentTagIds.length is 0, 1 or 2
        const needed = 3 - currentTagIds.length;
        newTagList = newTagList.slice(0, needed);
      }
    }
    
    parsedData.tagIds = currentTagIds;
    parsedData.newTags = Array.from(new Set(newTagList));
    
    // Attach the model info so the UI can log/show it
    parsedData._aiModelUsed = modelName;
    return parsedData;
  } catch (error: any) {
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
    let errorMsg = error.message || `API 请求发送失败 (status: ${status}, url: ${url})。详细错误: ${errorDetail}`;
    
    if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
    } else if (error.error?.message) {
        errorMsg = error.error.message;
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

  return dims
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

      const nums = parsingPart.match(/(\d+(\.\d+)?)/g) || [];
      const hasH = /H/i.test(parsingPart);
      const hasW = /W/i.test(parsingPart);
      const hasD = /D/i.test(parsingPart);
      const hasL = /L/i.test(parsingPart);

      if (hasH || hasW || hasD || hasL) {
        // 1️⃣ Strict identification by labels (H/W/D/L)
        // H → height
        // W 或 L → width / length
        // D → depth (mapping to length if length is 0, else width)
        const hMatch = parsingPart.match(/H\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const wMatch = parsingPart.match(/W\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const lMatch = parsingPart.match(/L\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
        const dMatch = parsingPart.match(/D\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);

        if (hMatch) height = parseFloat(hMatch[1]);
        
        // Handle W and L competing for width/length slots
        if (wMatch && lMatch) {
          width = parseFloat(wMatch[1]);
          length = parseFloat(lMatch[1]);
        } else if (wMatch) {
          width = parseFloat(wMatch[1]);
        } else if (lMatch) {
          length = parseFloat(lMatch[1]);
        }

        // Handle D (Depth) mapping to length if not used, else width
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
      
      // 3️⃣ If no numbers or fail, length/width/height remain 0.

      return { 
        ...d, 
        label: originalLabel.trim(),
        unit: d.unit === 'inch' ? 'inch' : 'cm',
        length,
        width,
        height,
        isAI: true
      };
    })
    .filter(Boolean);
};

export const translateDescription = async (
  zhText: string,
  apiKey: string,
  customModel?: string,
  signal?: AbortSignal
): Promise<{ en: string; ms: string }> => {
  const modelName = customModel;
  if (!modelName) throw new Error('请在设置中配置 AI 模型 (Model Name)');

  const prompt = `
你是一个专业的家具贸易翻译官。
请将以下中文产品描述翻译成【英文】和【马来文】。

【待翻译中文】：
${zhText}

【要求】：
1. 翻译风格：专业、商务、吸引人。英译应符合欧美电商水平。马来文应符合马来西亚在地口语与专业术语。
2. 保持专业术语的一致性（例如：Marble -> Guli/Marmar, Extendable -> Boleh dipanjangkan）。
3. 仅返回 JSON 格式。

【返回格式】：
{
  "en": "...",
  "ms": "..."
}
  `;

  try {
    const fetchUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
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
    const parsed = JSON.parse(content || '{}');
    
    return {
      en: parsed.en || '',
      ms: parsed.ms || ''
    };
  } catch (err) {
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
