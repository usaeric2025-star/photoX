import { Category, Tag } from '../types';

export const analyzeProductPhoto = async (
  base64Image: string,
  categories: Category[],
  tags: Tag[],
  customApiKey?: string,
  provider: string = 'auto',
  customModel?: string
) => {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('請先在管理設定中設定 API 金鑰');
  }

  let baseURL = 'https://api.groq.com/openai/v1';
  let modelName = customModel || 'llama-3.2-90b-vision-instruct'; // default to groq

  // Auto-detect or forced selection
  if (provider === 'openrouter' || (provider === 'auto' && apiKey.startsWith('sk-or-'))) {
    baseURL = 'https://openrouter.ai/api/v1';
    modelName = customModel || 'meta-llama/llama-3.2-11b-vision-instruct';
  } else if (provider === 'github' || (provider === 'auto' && apiKey.startsWith('ghp_'))) {
    baseURL = 'https://models.inference.ai.azure.com';
    modelName = customModel || 'gpt-4o-mini';
  } else if (provider === 'groq' || (provider === 'auto' && apiKey.startsWith('gsk_'))) {
    baseURL = 'https://api.groq.com/openai/v1';
    modelName = customModel || 'llama-3.2-90b-vision-instruct';
    // Forward-compatibility for users with stuck localStorage configs
    if (modelName === 'llama-3.2-11b-vision-preview' || modelName === 'llama-3.2-90b-vision-preview') {
      modelName = 'llama-3.2-90b-vision-instruct';
    }
  } else if (provider === 'gemini' || (provider === 'auto' && apiKey.startsWith('AIza'))) {
    baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
    modelName = customModel || 'gemini-2.0-flash';
  }

  const categoriesJson = categories.map(c => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories.map(s => ({ id: s.id, name: s.name }))
  }));
  const tagsJson = tags.map(t => ({ id: t.id, name: t.name }));

  const promptText = `
  你是一位家具專業分析師。請分析這張照片並提供以下精確資訊：
  
  1. 分類 (Classification)：從「現有分類」中選擇最合適的一個。這是首要任務，請務必精準匹配。如果產品類型完全不在現有清單中，才在 newCategoryName 中建議一個新分類名。
  2. 標籤 (Tags)：請提供「至少 2 個且剛好 2 個」最能描述該家具產品的標籤。
     - 優先從「現有標籤」中挑選符合的標籤。
     - 若現有標籤不足以描述產品特色，請在 newTagName 中建議新的標籤（最多建議 2 個，以逗號隔開）。
  
  重要原則：
  - 嚴禁「亂選」：如果現有分類或標籤不匹配，請給予 newCategoryName 或 newTagName，而不是強迫選一個不相關的。
  - 標籤數量：請確保回傳內容總共包含 2 個標籤（現有標籤 + 建議標籤 = 2）。
  - 同時也請提供一個準確的「家具名稱 (name)」以及估計的「尺寸 (dimensions)」。
  
  現有分類：
  ${JSON.stringify(categoriesJson)}
  
  現有標籤：
  ${JSON.stringify(tagsJson)}
  
  請回傳 JSON 格式：
  {
    "name": "家具名稱",
    "categoryId": "string (若匹配現有分類) 或 null",
    "newCategoryName": "string (若無匹配現有分類則填寫建議名稱) 或 null",
    "subcategoryId": "string or null",
    "tagIds": ["string array, 現有標籤 ID"],
    "newTagName": "建議的新標籤名 (若現有標籤不足 2 個則提供建議，以逗號隔開) 或 null",
    "dimensions": { "length": 0, "width": 0, "height": 0, "unit": "cm" }
  }
  `;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'Product Cataloger AI'
    };

    const requestBody = {
      model: modelName,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: { url: base64Image }
            }
          ]
        }
      ],
      max_tokens: 300,
    };

    const fetchResponse = await fetch(`${baseURL}${baseURL.endsWith('/') ? '' : '/'}chat/completions`, {
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
      throw { status: fetchResponse.status, response: { data: errorData } };
    }

    const data = await fetchResponse.json();
    const textOutput = data.choices[0]?.message?.content;
    
    if (!textOutput) {
      throw new Error('AI 未回傳分析結果');
    }

    // Safely extract JSON in case the model wraps it in markdown blocks
    const startIndex = textOutput.indexOf('{');
    const endIndex = textOutput.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('回傳格式錯誤，找不到 JSON');
    }
    
    const jsonStr = textOutput.substring(startIndex, endIndex + 1);
    const parsedData = JSON.parse(jsonStr);
    
    // Total tags enforcement: Ensure we have exactly 2 tags (ID or New Name)
    let currentTagCount = (parsedData.tagIds || []).length;
    let newTagList = parsedData.newTagName ? parsedData.newTagName.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    
    // If we have more than 2 total, trim them down
    if (currentTagCount + newTagList.length > 2) {
      if (currentTagCount >= 2) {
        parsedData.tagIds = parsedData.tagIds.slice(0, 2);
        parsedData.newTagName = null;
      } else {
        // currentTagCount is 0 or 1
        const needed = 2 - currentTagCount;
        parsedData.newTagName = newTagList.slice(0, needed).join(', ');
      }
    }
    
    // Attach the model info so the UI can log/show it
    parsedData._aiModelUsed = modelName;
    return parsedData;
  } catch (error: any) {
    console.error("GeminiService API Error:", error);
    const status = error.status || error.response?.status || 500;
    
    // Safely extract the most descriptive error message possible
    let errorMsg = '未知錯誤';
    if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
    } else if (error.error?.message) {
        errorMsg = error.error.message;
    } else if (error.message) {
        errorMsg = error.message;
    }
    
    // Check if body is plain text or json
    if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('does not have permission')) {
        errorMsg = "API Key 沒有權限、遭停權，或是此地區被封鎖: " + error.response.data;
    }

    throw new Error(`AI_FAIL|${status}|${errorMsg}`);
  }
};
