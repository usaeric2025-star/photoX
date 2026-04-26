import { Category, Tag } from '../types';

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
  categories: any[], // Now taking dbCategories
  tags: Tag[],
  manufacturers: any[], // New parameter
  customApiKey?: string,
  provider: string = 'auto',
  customModel?: string,
  targetCategoryId?: string | null,
  originalName?: string | null,
  signal?: AbortSignal
) => {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('請先在管理設定中設定 API 金鑰');
  }

  // Use OpenRouter endpoint
  const baseURL = 'https://openrouter.ai/api/v1';
  let modelName = customModel || 'google/gemini-2.5-flash-lite-preview-09-2025';
  
  // Ensure the model name includes the provider prefix if needed, openrouter models usually look like google/gemini-...
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


  const categoriesJson = categories.map(c => ({
    code: c.code, 
    name: c.zh
  }));
  const manufacturersJson = manufacturers.map(m => ({ id: m.id, name: m.name }));
  const tagsJson = tags.map(t => ({ id: t.id, name: t.name }));
  const categoryContext = targetCategoryId
    ? `【強制要求】系統已預設分類為: ${categories.find(c => c.code === targetCategoryId)?.zh} (code: ${targetCategoryId})。請確認照片分類是否符合此設定。`
    : `【強制要求】請從現有分類中選擇最合適的一個。`;

  const promptText = `
  你是一位家具專業分析師。請分析照片中的家具，並嚴格按照以下規則提取資訊：

  【優先級 1：圖片文字識別】
  - 請仔細觀察照片中是否有任何標籤、吊牌、包裝盒上的文字。
  - **如果識別到產品名稱、系列名或品牌名，請優先填入 "name" 欄位。**
  - **識別標價牌或標籤上的手寫/列印代號，填入 "manualCode"。**
  - **識別規格標籤上的產品型號 (Model No/SKU)，填入 "modelNumber"。**
  - **識別尺寸信息 (H/W/L)，如有測量標註，請識別。**

  【優先級 2：外觀特徵分析】
  - 如果圖中沒有明確名稱，請根據家具樣式給出一個專業的 **英文名稱**。
  - 若原名稱 "${originalName || '無'}" 為純數字或 "未命名"，則必須更新為專業名稱。

  【核心規則 - 必須遵守】
  1. **標籤 (Tags)**：
     - **優先從現有標籤中選擇**：${JSON.stringify(tagsJson)}。
     - 如果現有不符，請建議 **1 到 2 個新的英文單字**。
     - **規則：標籤必須是單個英文單詞 (Single English word)，禁止使用中文，禁止使用片語。**
  2. **尺寸 (Dimensions)**：
     - **如果你識別出照片中有不同的規格或多組尺寸，請全部列出**。
     - 每組尺寸必須包含 "label" (規格名稱, 例如 '3-Seater', '2-Seater', 'Package'), "length", "width", "height", "unit", "isAI": true。
     - **單位識別**：請仔細辨認是 cm 還是 inch。如果無法確定，默認使用 cm。
  3. **廠商 (subcategoryId)**：禁止識別或修改。回傳值必須為 null。
  4. **分類 (categoryId)**：必須從代碼清單中選擇：${JSON.stringify(categoriesJson)}。
  5. **輸出格式**：僅回傳一個合法、壓縮的 JSON 物件。禁止 Markdown。

  【JSON 範例格式】
  {"name":"Product Name","categoryId":"category_code","subcategoryId":null,"tagIds":[],"newTagName":"Modern, Velvet","dimensions":[{"label":"Package","length":100,"width":80,"height":50,"unit":"cm","isAI":true}],"manualCode":null,"modelNumber":null,"note":null}
  `;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'Product Cataloger AI',
    };


    
    // Debug image
    const isDataUri = base64Image.startsWith('data:');
    const commaIndex = base64Image.indexOf(',');
    const prefix = isDataUri ? base64Image.substring(0, commaIndex) : 'NO_PREFIX';
    console.log(`Debug Image Info:\nPrefix: ${prefix}\nTotal Length: ${base64Image.length}\nFirst 50 chars: ${base64Image.substring(0, 50)}...`);

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
      max_tokens: 300,
    };


    const fetchUrl = 'https://openrouter.ai/api/v1/chat/completions';
    
    console.log("DEBUG: Final fetch URL is:", fetchUrl);
    
    console.log("DEBUG: Sending AI Request", {
        url: fetchUrl,
        model: modelName,
        headers: Object.keys(headers),
        imageSize: base64Image.length
    });

    const fetchResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal
    });

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
      throw new Error(`AI 未回傳分析結果 (URL: ${fetchUrl})`);
    }

    // Safely extract JSON in case the model wraps it in markdown blocks
    const startIndex = textOutput.indexOf('{');
    const endIndex = textOutput.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('回傳格式錯誤，找不到 JSON');
    }
    
    const jsonStr = textOutput.substring(startIndex, endIndex + 1);
    
    // Improved sanitize: remove control characters and attempt to fix common unescaped quotes within values
    const saferJson = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ") // Replace control characters with space
      .replace(/,\s*([}\]])/g, "$1") // Remove trailing commas
      .replace(/\r?\n|\r/g, " "); // Replace line breaks with spaces inside strings

    let parsedData;
    try {
      parsedData = JSON.parse(saferJson);
    } catch (parseErr) {
      // Emergency cleanup for common value-side syntax errors (like unescaped quotes)
      try {
        const heuristicFixed = saferJson.replace(/":\s*"(.*?)"(\s*[},])/g, (match, p1, p2) => {
          // If the internal string p1 has unescaped double quotes, it's invalid.
          // This is a dangerous regex but helps with simple nested quotes like "Product "Name""
          return `": "${p1.replace(/"/g, '\\"')}"${p2}`;
        });
        parsedData = JSON.parse(heuristicFixed);
      } catch (e) {
        console.error("Initial JSON parse failed. URL:", fetchUrl, "Raw:", textOutput);
        throw parseErr;
      }
    }
    
    // Normalize dimensions: Always an array
    let safeDims: any[] = [];
    if (Array.isArray(parsedData.dimensions)) {
      safeDims = parsedData.dimensions;
    } else if (parsedData.dimensions && typeof parsedData.dimensions === 'object') {
      safeDims = [parsedData.dimensions];
    }
    parsedData.dimensions = safeDims;

    // Normalize tagIds to always be an array of strings
    let safeTagIds: string[] = [];
    if (Array.isArray(parsedData.tagIds)) {
      safeTagIds = parsedData.tagIds.map(String);
    } else if (typeof parsedData.tagIds === 'string') {
      safeTagIds = parsedData.tagIds.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    parsedData.tagIds = safeTagIds;

    // Normalize newTagName to always be an array of strings initially
    let newTagList: string[] = [];
    if (Array.isArray(parsedData.newTagName)) {
      newTagList = parsedData.newTagName.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof parsedData.newTagName === 'string') {
      newTagList = parsedData.newTagName.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // Total tags enforcement: Ensure we have exactly 2 tags (ID or New Name)
    let currentTagCount = parsedData.tagIds.length;
    
    // If we have more than 2 total, trim them down
    if (currentTagCount + newTagList.length > 2) {
      if (currentTagCount >= 2) {
        parsedData.tagIds = parsedData.tagIds.slice(0, 2);
        newTagList = [];
      } else {
        // currentTagCount is 0 or 1
        const needed = 2 - currentTagCount;
        newTagList = newTagList.slice(0, needed);
      }
    }
    
    // De-duplicate tags by name if possible (though we handle IDs and names separately)
    // For now, let's just make sure we don't have the same name twice in newTagName
    if (newTagList.length > 0) {
       const uniqueNewTags = Array.from(new Set(newTagList));
       parsedData.newTagName = uniqueNewTags.join(', ');
    } else {
       parsedData.newTagName = null;
    }
    
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
