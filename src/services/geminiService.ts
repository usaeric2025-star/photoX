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
- 識別標價牌或標籤上的手寫/列印代號，填入 "manualCode"
- 識別規格標籤上的產品型號（Model No / SKU），填入 "modelNumber"，若無則填 null
- 識別尺寸信息（H/W/L），如有測量標註、吊牌上的尺寸請務必識別

【優先級 2：名稱規則 - 強制執行】
- "name" 字段無論任何情況必須填寫，不能為空
- 如果照片上有文字名稱：優先使用，中文一律翻譯成英文
- 如果照片上沒有文字名稱：根據家具外觀給出專業英文名稱
- 如果原本名稱是純數字或編號：直接替換為專業英文名稱
- 名稱格式：英文，首字母大寫，簡潔專業

【優先級 3：多語系說明 - 核心要求】
- 分別生成三種語言的產品說明：中文 (zh)、英文 (en)、馬來文 (ms)
- 說明家具的外觀、材質、風格或用途
- **必須**同時提供這三種語言，不得缺失。
- 格式要求：
  - "description_translations": { "zh": "...", "en": "...", "ms": "..." }
  - 同時將 "zh" 的內容複製到根級別的 "description" 欄位。

【核心規則 - 必須遵守】

1. 語言規範：
   - "zh": 專業中文描述
   - "en": Professional English description
   - "ms": Penerangan profesional dalam Bahasa Melayu
   - 【強制要求】三種語言必須完整提供，不得為空。

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

1. 識別圖片上的所有尺寸标注。
2. 如果只有一个完整的“长 x 宽 x 高”标注 → 返回一个尺寸对象。
3. 如果有多个完整的“长 x 宽 x 高”标注（不同部件） → 分别返回多个尺寸对象。
4. 如果没有完整标注，只有拆分标注（如“总高”、“宽”、“座高”） → 合并为一个尺寸对象。
5. 如果图片上完全没有尺寸标注 → **留空，不返回尺寸对象**（不要用 “overall” 或猜测通用词）。
6. 如果无法确定部件名称（例如不确定是“桌子”还是“抽屉”） → **\`part\` 字段留空，不要写 “overall” 或类似占位词**。
7. 每个尺寸对象包含：
   - label（必填）：尺寸字符串，如 "120x60x75"
   - unit（必填）：cm / mm / inch
   - part（可选）：只有确定时才填写，不确定就省略
   - isAIEstimated（可选）：AI 估算时设为 true

3. 分類（categoryId）：${categoryContext} 現有分類清單（請填入對應的 id）：${JSON.stringify(categoriesJson)}

4. 輸出規範：
   - 僅回傳一個合法且壓縮的 JSON 物件。
   - 禁止 Markdown 標記（如 \` \` \`json）。
   - 所有字串欄位嚴禁包含換行符或未轉義的雙引號。
   - 數字欄位必須為純數字（不含單位）。

【JSON 輸出格式範例】
{
  "manualCode": "A-1234",
  "modelNumber": "M-5566",
  "name": "Modern Leather Sofa",
  "description": "這是一款帶有金屬腿的現代簡約真皮沙發，設計優雅且耐用。",
  "description_translations": {
    "zh": "這是一款帶有金屬腿的現代簡約真皮沙發，設計優雅且耐用。",
    "en": "A sleek modern leather sofa with metal legs, designed for elegance and durability.",
    "ms": "Sofa kulit moden yang kemas dengan kaki logam, direka untuk keanggunan dan ketahanan."
  },
  "categoryId": "123e4567-e89b-12d3... (存在清單中的 UUID)",
  "tagIds": ["abc-123...", "def-456..."],
  "newTags": ["MINIMALIST"],
  "dimensions": [
    {
      "label": "Overall",
      "length": 210,
      "width": 90,
      "height": 85,
      "unit": "cm",
      "isAI": true
    }
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
    
    // Validate translations
    const translations = parsedData.description_translations;
    // Make translation validation more resilient: fill missing ones instead of failing
    const zh = translations?.zh || parsedData.description || (parsedData.name || '家具产品');
    const en = translations?.en || (zh ? `Product: ${parsedData.name || 'Furniture'}` : 'Furniture product');
    const ms = translations?.ms || (zh ? `Produk: ${parsedData.name || 'Perabot'}` : 'Produk perabot');
    
    parsedData.description_translations = { zh, en, ms };
    if (!parsedData.description) parsedData.description = zh;

    // Normalize dimensions: Always an array
    let safeDims: any[] = [];
    if (Array.isArray(parsedData.dimensions)) {
      safeDims = parsedData.dimensions;
    } else if (parsedData.dimensions && typeof parsedData.dimensions === 'object') {
      safeDims = [parsedData.dimensions];
    }
    parsedData.dimensions = safeDims;

    // Normalize tagIds to always be an array of strings
    parsedData.tagIds = normalizeTagIds(parsedData.tagIds);

    // Normalize newTags to always be an array of strings
    let newTagList: string[] = [];
    if (Array.isArray(parsedData.newTags)) {
      newTagList = parsedData.newTags.map(s => String(s).trim()).filter(Boolean);
    }

    // Total tags enforcement: Ensure we have exactly 2 tags (ID or New Name)
    let currentTagIds = parsedData.tagIds;
    
    // If we have more than 2 total, trim them down
    if (currentTagIds.length + newTagList.length > 2) {
      if (currentTagIds.length >= 2) {
        currentTagIds = currentTagIds.slice(0, 2);
        newTagList = [];
      } else {
        // currentTagIds.length is 0 or 1
        const needed = 2 - currentTagIds.length;
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
