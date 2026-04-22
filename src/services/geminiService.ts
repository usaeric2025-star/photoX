import { GoogleGenAI, Type } from '@google/genai';
import { Category, Tag } from '../types';

export const analyzeProductPhoto = async (
  base64Image: string,
  categories: Category[],
  tags: Tag[],
  customApiKey?: string
) => {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('請先在管理設定中設定 Gemini API 金鑰');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Extract base64 payload and mime type
  // data:image/jpeg;base64,/9j/4AAQSkZJRg...
  const match = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    throw new Error('圖片格式不正確');
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const categoriesJson = categories.map(c => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories.map(s => ({ id: s.id, name: s.name }))
  }));

  const tagsJson = tags.map(t => ({ id: t.id, name: t.name }));

  const prompt = `
  You are an expert product cataloger. Analyze this product photo.
  
  Available Categories (with IDs):
  ${JSON.stringify(categoriesJson)}

  Available Tags (with IDs):
  ${JSON.stringify(tagsJson)}

  Task:
  1. Select the BEST matching categoryId from the provided list based on the photo. If no existing match is good, set categoryId to null and provide a 'newCategoryName' (max 1).
  2. Select the BEST matching subcategoryId from the chosen category. If no existing match is good, set subcategoryId to null and provide a 'newSubCategoryName' (max 1).
  3. Select relevant tagIds from the provided list. If missing a critical tag, you can provide at most ONE 'newTagName'.
  4. Do NOT generate a description or note.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categoryId: { type: Type.STRING, nullable: true },
            newCategoryName: { type: Type.STRING, nullable: true },
            subcategoryId: { type: Type.STRING, nullable: true },
            newSubCategoryName: { type: Type.STRING, nullable: true },
            tagIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            newTagName: { type: Type.STRING, nullable: true }
          }
        }
      }
    });

    if (!response.text) {
      throw new Error('AI 未回傳分析結果');
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw new Error('AI 辨識失敗：' + (error.message || '未知錯誤'));
  }
};
