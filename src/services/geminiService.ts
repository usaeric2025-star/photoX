import { Category, Tag } from '../types';

const resizeBase64Image = async (base64Str: string, maxWidth: number, maxHeight: number): Promise<string> => {
  // Use a Blob/OffscreenCanvas approach or simply fetch the data if it is a URL.
  // Since we already have a data URL, we can attempt to fetch it and turn it into a Blob if needed.
  // Actually, for simplicity and to avoid Canvas, let's bypass resizing if it's already a data: URL, 
  // or use the browser's native image loading with crossOrigin if URL.
  
  // Revised approach: Bypass canvas if not strictly required, or assume the source is OK.
  // If it's still failing, it's likely the canvas.toDataURL call itself. 
  // For now, let's just return the original base64 to fix the AI_FAIL|500 error first.
  return base64Str;
};

export const analyzeProductPhoto = async (
  base64Image: string,
  categories: Category[],
  tags: Tag[],
  customApiKey?: string,
  provider: string = 'auto',
  customModel?: string,
  targetCategoryId?: string | null
) => {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  console.log("DEBUG: API Key verification (first 5 chars):", apiKey ? apiKey.substring(0, 5) : "UNDEFINED");
  if (!apiKey) {
    throw new Error('請先在管理設定中設定 API 金鑰');
  }

  // Pre-process image: Resize if too large
  let processedBase64Image = base64Image;
  // Canvas-based resizing is removed to avoid cross-origin issues.
  
  // Use OpenRouter endpoint
  const baseURL = 'https://openrouter.ai/api/v1';
  let modelName = customModel || 'google/gemini-2.5-flash-lite-preview-09-2025';


  const categoriesJson = categories.map(c => ({
    id: c.id,
    name: c.name,
    subcategories: (c.subcategories || []).map(s => ({ id: s.id, name: s.name }))
  }));
  const tagsJson = tags.map(t => ({ id: t.id, name: t.name }));

  const categoryContext = targetCategoryId 
    ? `【強制要求】系統已預設分類為: ${categories.find(c => c.id === targetCategoryId)?.name} (ID: ${targetCategoryId}。請在此分類下進行識別並找出最合適的子分類。` 
    : `請從以下分類中選擇最合適的一個。`;

  const promptText = `
  你是一位家具專業分析師。請分析這張照片並提供以下精確資訊：
  
  ${categoryContext}
  
  1. 分類 (Classification)：從「現有分類」中選擇最合適的一個。${targetCategoryId ? '請務必選擇 ID 為 ' + targetCategoryId + ' 的分類。' : '這是首要任務，請務必精準匹配。如果產品類型完全不在現有清單中，才在 newCategoryName 中建議一個新分類名。'}
  2. 標籤 (Tags)：請提供「剛好 2 個」最能描述該家具產品的標籤。請務必提供，不能少於 2 個。
     - 優先從「現有標籤」中挑選符合的標籤。
     - 若現有標籤不足以描述產品特色，請在 newTagName 中建議新的標籤（總數湊齊 2 個，以逗號隔開）。請確保建議的標籤名稱不與現有標籤重複。
  3. 產品名稱 (Name)：請識別照片中的家具並為其取一個合適的產品名稱。請務必提供名稱，且「僅能使用英文 (English)」。絕對不要使用中文字符。如果圖片中沒有明確名稱，請根據家具的特徵（例如：Modern Wood Dining Table）自動生成一個描述性的名稱。
  
  重要原則：
  - 完整性要求：產品名稱、分類、以及 2 個標籤都是「強制性」的。如果缺乏其中任何一項，將被視為無效回傳。
  - 嚴禁「亂選」：如果現有分類或標籤不匹配，請給予 newCategoryName 或 newTagName，而不是強迫選一個不相關的。
  - 標籤數量：請確保回傳內容總共包含 2 個標籤（現有標籤 + 建議標籤 = 2）。
  - 若無法準確判斷家具尺寸，請「不要」隨意猜測，直接省略或回傳 null 即可。只有在非常明顯且有參照物的情況下才提供尺寸預估。
  
  現有分類：
  ${JSON.stringify(categoriesJson)}
  
  現有標籤：
  ${JSON.stringify(tagsJson)}
  
  請回傳 JSON 格式：
  {
    "name": "Product Name (Only English)",
    "categoryId": "string (若匹配現有分類) 或 null",
    "newCategoryName": "string (若無匹配現有分類則填寫建議名稱) 或 null",
    "subcategoryId": "string or null",
    "tagIds": ["string array, 現有標籤 ID"],
    "newTagName": "建議的新標籤名 (若現有標籤不足 2 個則提供建議，以逗號隔開) 或 null",
    "dimensions": { "length": 0, "width": 0, "height": 0, "unit": "cm" } // 未知尺寸時回傳 null
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
    alert(`Debug Image Info:\nPrefix: ${prefix}\nTotal Length: ${base64Image.length}\nFirst 50 chars: ${base64Image.substring(0, 50)}...`);

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


    const fetchUrl = `${baseURL}${baseURL.endsWith('/') ? '' : '/'}chat/completions`;
    
    console.log("DEBUG: Sending AI Request", {
        url: fetchUrl,
        model: modelName,
        headers: Object.keys(headers),
        imageSize: base64Image.length
    });

    const fetchResponse = await fetch(fetchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
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
    alert('AI API 錯誤詳情:\n' + JSON.stringify({ 
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
      apiKey,
      provider,
      customModel
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
