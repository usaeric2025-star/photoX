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
    throw new Error('請先在管理設定中設定 AI 金鑰');
  }

  // Use OpenRouter endpoint
  const baseURL = 'https://openrouter.ai/api/v1';
  // Strictly read from configuration, NO defaults allowed
  let modelName = customModel;
  
  if (!modelName) {
    throw new Error('請在設置中配置 AI 模型 (Model Name)');
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
    ? `【強制要求】系統已預設分類為: ${(categories || []).find(c => String(c.id) === String(targetCategoryId))?.zh || (categories || []).find(c => String(c.id) === String(targetCategoryId))?.name} (id: ${targetCategoryId})。請確認照片分類是否符合此設定。`
    : `【強制要求】請從現有分類中選擇最合適的一個。`;

  const promptText = `
你是一位家具專業分析師。請分析照片中的家具，並嚴格按照以下規則提取資訊：

【優先級 1：圖片文字識別】
- 仔細觀察照片中是否有任何標籤、吊牌、包裝盒、說明書上的文字
- **【核心指令 - 型號識別】識別並提取型號代碼（如 Model No, SKU, Code 等），一律單獨填入 "modelNumber" 欄位。禁止將型號混入名稱中。**
- **【嚴格禁止】禁止識別或填寫 "manualCode" 欄位，該欄位必須保持為 null。AI 識別不准填寫此欄位，它僅供人工手寫填入。**
- **【核心指令 - 尺寸識別】識別照片中出現的尺寸標註。務必將高度(Height/H)、寬度(Width/W)、深度或長度(Depth/D/L)分別識別。**
- **【嚴格限制】如果照片中完全沒有尺寸信息，"dimensions" 一律設為空數組 []。禁止將任何標籤符號識別為尺寸。**

【優先級 2：名稱規則 - 強制執行】
- "name" 字段無論任何情況必須填寫，不能為空。
- **【嚴格限制】禁止在名稱中包含任何型號、尺寸（如 Dimension, Size, Measurement, HxWxL, 100cm 等）、測量值、編號信息。**
- 如果原本名稱是純數字、編號或帶有型號/尺寸信息：直接替換為專業英文名稱（例如：不准包含 "SK-2024" 或尺寸描述）。
- 名稱格式：英文，首字母大寫，簡潔專業 (例如: "Modern Leather Sofa")。

【優先級 3：外觀特徵分析】
- 生成一份詳細且專業的【繁體中文 (Traditional Chinese)】產品說明，說明家具的外觀、材質、風格或用途。
- 【絕對限制】：務必僅使用【繁體中文】生成初步描述，禁止使用英文，填入 "description" 字段。

【核心規則 - 必須遵守】

1. 語言規範：
    - "description": 必須填寫專業【繁體中文】描述。不得包含任何英文句子，除非是不可翻譯的品牌名或專有名詞。
    - 【重要】：如果 AI 模型默認生成英文，請務必將其翻譯為【繁體中文】後再填入 "description"。
    - 【強制要求】：中文描述必須完整提供，不得為空，不得填入產品名稱，必須是描述性語句。

2. 標籤（Tags）：
   - 強制選取或新增 2-3 個標籤以描述產品。
   - 【極其重要】語義去重：請仔細對比現有標籤清單 ${JSON.stringify(tagsJson)}。
   - 如果你想新增的標籤與現有標籤意思接近（例如：Marble 與 Marblelook、Sofa 與 Couches、Leather 與 Faux-leather）、或是包含關係，必須優先選擇現有標籤清單中的詞，嚴禁新增語義重複的標籤。
   - 現有標籤請直接填入該標籤的 id 到 "tagIds" 數組中。
   - 標籤側重：家具用途/性質、風格、材質、顏色等。
   - 若現有標籤完全無關聯，才可以填入 "newTags"。
   - 強制規範：新標籤每個必須是單一英文單詞，不得包含空格、符號或數字，且必須全部大写 (UPPERCASE)。
   - 新增標籤填入 "newTags" 字段，格式為數組（如 ["RATTAN"]），若不新增則返回 []。

2. 尺寸（Dimensions）：

【尺寸識別規則】

1. 仔細掃描圖片上的所有尺寸文字標註。
2. 只要圖片中顯示的尺寸，都要列出。
3. 如果有多個尺寸標註（部件或總長寬高等），不論是否完整，請儘量分別返回多個尺寸對象，嚴禁隨意合併！
4. 如果圖片上完全沒有尺寸標註 → **留空，不返回尺寸對象**。
6. 如果无法确定部件名称 → **part 字段留空，不要写 “overall” 或提示词**。
7. 每个尺寸对象包含：
   - label（必填）：尺寸字符串，如 "120cm" 或 "120x60x75"
   - unit（必填）：cm / mm / inch
   - part（可选）：只有极其确定时才填写
   - isAIEstimated（可选）：AI 估算时设为 true

3. 分類（categoryId）：${categoryContext} 現有分類清單（請填入對應的 id）：${JSON.stringify(categoriesJson)}

4. 輸出規範：
   - 僅回傳一個合法且壓縮的 JSON 物件。
   - 禁止 Markdown 標記（如 \` \` \`json）。
   - 所有字串欄位嚴禁包含換行符或未轉義的雙引號。
   - 數字欄位必須為純數字（不含單位）。

【JSON 輸出格式範例】
{
  "manualCode": null,
  "modelNumber": "SK-2024 (或其他識別到的編號/型號)",
  "name": "Modern Leather Sofa",
  "description": "這是一款採用義大利進口大理石打造的餐桌，設計優雅且耐用。",
  "categoryId": "123e4567-e89b-12d3... (存在清單中的 UUID)",
  "tagIds": ["abc-123...", "def-456..."],
  "newTags": ["MINIMALIST"],
  "dimensions": [
    { "label": "120cm" },
    { "label": "85cm" },
    { "label": "110cm" }
  ]
}

請確保輸出為嚴格有效的 JSON。只返回 JSON，不要任何其他文字。
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
      throw new Error(`AI 未回傳分析結果`);
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
      throw new Error('回傳格式錯誤，找不到 JSON 對象');
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
           throw new Error(`JSON 解析失敗: ${parseErr instanceof Error ? parseErr.message : '解析格式錯誤'}`);
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
    let errorMsg = error.message || `API 請求發送失敗 (status: ${status}, url: ${url})。詳細錯誤: ${errorDetail}`;
    
    if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
    } else if (error.error?.message) {
        errorMsg = error.error.message;
    }
    
    // Check if body is plain text or json
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('does not have permission')) {
        errorMsg = "API Key 沒有權限、遭停權，或是此地區被封鎖: " + error.response.data;
    }

    // Direct debug alerting as requested by user
    console.error('AI API 錯誤詳情:\n' + JSON.stringify({ 
        status: status, 
        message: errorMsg,
        errorRaw: error 
    }, null, 2));

    throw new Error(`AI_FAIL|${status}|${errorMsg}`);
  }
};

/**
 * AI Recognition Dimensions Automatic Cleaning Function
 */
export const normalizeDimensions = (dims: any[]): any[] => {
  if (!Array.isArray(dims) || dims.length === 0) return [];

  // Define regex to match only valid dimension-like strings
  // e.g., "120", "120 cm", "120x60x75"
  const dimensionRegex = /^\d+(\.\d+)?\s*(cm|mm|inch|in)?(\s*x\s*\d+(\.\d+)?\s*(cm|mm|inch|in)?)*$/i;

  return dims
    .map(d => {
      if (!d) return null;
      let label = typeof d === 'string' ? d : String(d.label || '');
      if (!label) return null;

      // 1. Clean common descriptive language that gets caught in AI label extraction
      // Remove "H", "W", "D", "L", "Overall", "approx", "size" if they are clearly descriptive markers
      // but keep them if they might be part of the actual data, this is tricky.
      // Let's strip typical junk:
      label = label.replace(/(overall|size|dimension|measurement|approx)/gi, '').trim();

      // 2. If it still looks like "H49", try to strip the letter prefix if it's just a label marker
      // This is high risk, let's just attempt to extract the first number found if the rule fits
      const match = label.match(/(\d+(\.\d+)?)/);
      if (!match) return null;
      
      // If the label is just a messy descriptive string like "H49\"/9\"", 
      // extract the core numeric part.
      const cleanLabel = label.replace(/[^\d\.\sx\s]/gi, '').trim();
      
      // Re-validate against our strict regex
      if (!dimensionRegex.test(cleanLabel)) {
          // If it fails, only keep the numeric part if it seems plausible
          // For now, return null to be safe rather than poisoning data
          return null;
      }

      return { 
        ...d,
        label: cleanLabel
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
  if (!modelName) throw new Error('請在設置中配置 AI 模型 (Model Name)');

  const prompt = `
你是一個專業的家具貿易翻譯官。
請將以下中文產品描述翻譯成【英文】和【馬來文】。

【待翻譯中文】：
${zhText}

【要求】：
1. 翻譯風格：專業、商務、吸引人。英譯應符合歐美電商水平。馬來文應符合馬來西亞在地口語與專業術語。
2. 保持專業術語的一致性（例如：Marble -> Guli/Marmar, Extendable -> Boleh dipanjangkan）。
3. 僅返回 JSON 格式。

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

    if (!response.ok) throw new Error(`翻譯失敗: ${response.statusText}`);
    
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
