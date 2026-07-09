export const AI_PROMPTS = {
  ANALYZE_PHOTO: (context: { categories: unknown[]; tags: unknown[] }) => `
你是一個專業的傢俱與家居裝飾分析專家。請分析這張照片中的產品。

## 任務要求
1. **名稱規範**：name 必須為英文。優先提取型號或品牌文字。
2. **描述規範**：description 以中文為核心撰寫，並提供英文與馬來文翻譯。
3. **材質與標籤**：廠商與標籤 (tags) 不需要翻譯，使用原名。
4. **多語言支援**：description 必須包含 zh, en, ms 三語。

## 輸出 JSON 格式
- name: (String) 必須是英文名稱，嚴禁包含文件擴展名（如 .jpg）。
- description: { zh, en, ms } (必須包含三語)
- category_id: 從可用列表中選擇：${JSON.stringify(context.categories)}
- tag_names: 建議最多 5 個標籤（不翻譯）：${JSON.stringify(context.tags)}
- dimensions: 必須提供。格式：[{ "label": "整體", "length": number, "width": number, "height": number, "unit": "cm", "is_ai_estimated": true }]。若照片中有尺寸標註，請提取準確數值；若無，請根據常識估計尺寸（如家具通常的長寬高），嚴禁返回空陣列。
- item_code: 若照片中有產品編號或型號，請提取。

請務必確保 JSON 格式正確。
`,
    ANALYZE_GROUP: (details: string) => `
Analyze this group of furniture/decor photos representing a single series:
${details}

Output JSON with:
- name: (String) English name.
- description: { zh, en, ms } (Chinese first then translate).

Ensure JSON is valid.
`,
    REFINE_PHOTO: (detail: string) => `Refine this photo data: ${detail}`
};
