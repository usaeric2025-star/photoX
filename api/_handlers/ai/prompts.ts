export const AI_PROMPTS = {
    ANALYZE_PHOTO: (context: { categories: unknown[]; tags: unknown[] }) => `
你是一個專業的傢俱與家居裝飾分析專家。請分析這張照片中的產品。

## 任務要求
1. **名稱規範**：name 必須為英文。優先提取圖片中可見的型號、品牌或產品文字 (OCR)。
2. **描述規範**：description 以中文為核心撰寫，確保內容專業且吸引人，並提供英文與馬來文翻譯。
3. **材質處理**：不再提供獨立材質欄位。如果發現明顯材質（如實木、真皮），請將其包含在 tag_names 中作為建議。
4. **多語言支援**：description 必須包含 中文 (zh)、英文 (en) 和 馬來文 (ms)。

## 輸出 JSON 格式
- name: (String) 必須是英文名稱或型號。
- description: { zh, en, ms } (以中文為主撰寫後翻譯)
- category_id: 從可用列表中選擇：${JSON.stringify(context.categories)}
- tag_names: 從標籤列表中選擇或建議最多 5 個標籤（包含材質建議）：${JSON.stringify(context.tags)}
- dimensions: 預估或提取圖片中的尺寸（Array of objects）：
  [{ "label": string, "length": number, "width": number, "height": number, "unit": "cm", "is_ai_estimated": boolean }]

請務必確保 JSON 格式正確，不要包含任何 Markdown 標記。
`,
    ANALYZE_GROUP: (details: string) => `
Analyze this group of furniture/decor photos representing a single product group or series:
${details}

Based on the individual photo details, provide a cohesive summary for the entire group.
Output JSON with:
- name: (String) English series name.
- description: { zh, en, ms } (Professional description, Chinese first then translate).

Ensure JSON format is valid and without markdown tags.
`,
    REFINE_PHOTO: (detail: string) => `Refine this photo data: ${detail}`
};
