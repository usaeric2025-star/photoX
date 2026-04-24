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
  你是一位家具型錄專家。請分析這張照片並提供家具的分類資訊。
  
  關鍵規則：
  1. 主分類與子分類：從「現有分類」中選擇最合適的一個。如果都不適合，請在 newCategoryName 中建議一個新分類名。
  2. 標籤 (產品分組)：如果這張照片看起來與「現有標籤」中的某個產品完全相同，請共用該標籤 ID。
  3. 家具名稱 (name)：根據圖片生成一個優雅簡短的家具名稱。
  4. 尺寸 (dimensions)：根據視覺經驗估算該家具的大約尺寸 (長、寬、高，單位：cm)。
  
  注意：不要生成家具描述 (description)，該欄位保留給用戶手動輸入。
  
  現有分類：
  ${JSON.stringify(categoriesJson)}
  
  現有標籤：
  ${JSON.stringify(tagsJson)}
  
  請務必回傳嚴格的 JSON 格式，結構如下：
  {
    "name": "家具名稱",
    "categoryId": "string or null",
    "newCategoryName": "string or null",
    "subcategoryId": "string or null",
    "newSubCategoryName": "string or null",
    "tagIds": ["string array"],
    "newTagName": "string or null",
    "dimensions": {
      "length": 0,
      "width": 0,
      "height": 0,
      "unit": "cm"
    }
  }
  不要包含 markdown 標籤 (\`\`\`json)。
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
    
    // Failsafe restrictions: enforce limits even if AI disobeys
    if (Array.isArray(parsedData.tagIds) && parsedData.tagIds.length > 1) {
      parsedData.tagIds = [parsedData.tagIds[0]]; // force keep only 1
    }
    if (Array.isArray(parsedData.tagIds) && parsedData.tagIds.length === 1) {
      parsedData.newTagName = null; // if an existing tag is selected, DO NOT add a duplicate new tag
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
