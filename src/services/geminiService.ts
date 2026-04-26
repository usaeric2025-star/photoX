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
    id: c.code, // dbCategories use .code
    name: c.zh, // Use chinese mapping
    enName: c.en
  }));
  const manufacturersJson = manufacturers.map(m => ({ id: m.id, name: m.name }));
  const tagsJson = tags.map(t => ({ id: t.id, name: t.name }));
  const categoryContext = targetCategoryId
    ? `【強制要求】系統已預設分類為: ${categories.find(c => c.code === targetCategoryId)?.zh} (ID: ${targetCategoryId})。請確認照片分類是否符合此設定。`
    : `【強制要求】請從現有分類中選擇最合適的一個。`;

  const promptText = `
  你是一位家具專業分析師。請分析這張照片並提供資訊。

  強制性要求：
  1. 分類 (CategoryId)：從現有分類中選擇最合適的 code。必須選，不可為 null。
  2. 產品名稱 (Name)：請識別照片中的家具並提供一個清晰、描述性的英文名稱。若照片中的家具沒有明顯可識別的名稱，或者現有名稱不適當（如純數字），請根據家具類型的外觀重新生成一個描述性英文名稱。

  可選資訊：
  3. 標籤 (Tags)：提供 1 到 2 個最貼切的標籤。名稱僅限英文單字。若現有標籤不足，建議新標籤。
  4. 尺寸 (Dimensions)：若明顯，請填寫，否則 null。

  現有分類：${JSON.stringify(categoriesJson)}
  現有標籤：${JSON.stringify(tagsJson)}

  請按照以下 JSON 格式回傳，不要包含 markdown：
  {
    "name": "English Name",
    "categoryId": "string",
    "subcategoryId": null,
    "tagIds": ["string"],
    "newTagName": "string or null",
    "newCategoryName": "string or null",
    "newSubCategoryName": null,
    "dimensions": { "length": 0, "width": 0, "height": 0, "unit": "cm" }
  }
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
    const parsedData = JSON.parse(jsonStr);
    
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
