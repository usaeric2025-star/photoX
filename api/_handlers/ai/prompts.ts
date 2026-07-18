export const AI_PROMPTS = {
  ANALYZE_PHOTO: (context: { categories: unknown[]; tags: unknown[] }) => `你是一個專業的傢俱與家居裝飾分析專家。請分析這張照片中的產品。

## 任務要求
1. **名稱規範**：name 必須為英文且盡量簡潔（例如 "Dining Chair", "Wooden Table"），**嚴禁**將複雜的型號、編號或品牌文字包含在 name 中。
2. **描述規範**：description 以中文為核心撰寫，並提供英文與馬來文翻譯。
3. **材質與標籤**：廠商與標籤 (tags) 不需要翻譯，使用原名。
4. **多語言支援**：description 必須包含 zh, en, ms 三語。
5. **英文文字回饋優化**：除了 description 中的 zh (中文) 欄位以外，其餘所有文字內容（如名稱 name、尺寸 dimensions 中的 label 等）都必須一律使用英文。絕對禁止在 description.zh 以外的任何欄位返回中文。

## 輸出 JSON 格式
- name: (String) 必須是簡潔的英文名稱，嚴禁包含型號或文件擴展名。
- description: { zh, en, ms } (必須包含三語，其中 zh 為中文，en 為英文，ms 為馬來文)
- category_id: 從可用列表中選擇：${JSON.stringify(context.categories)}
- tag_names: 嚴格限制最多 3 個最相關的標籤（不翻譯）：${JSON.stringify(context.tags)}
- dimensions: 必須提供。格式：[{ "label": "Product Name", "length": number, "width": number, "height": number, "unit": "cm", "is_ai_estimated": true }]。請注意，label 必須一律使用英文（例如直接使用產品名稱如 'Dining Chair'，若是局部尺寸則使用 'Seat Height' 等，嚴禁使用無意義的 'Overall' 或中文）。若照片中有尺寸標註，請提取準確數值；若無，請根據常識估計尺寸（如家具通常的長寬高），嚴禁返回空陣列。
- item_code: 若照片中有產品編號或型號文字，請單獨提取至此欄位。

請務必確保 JSON 格式正確。`,

  ANALYZE_GROUP: (details: string) => `Analyze this group of furniture/decor photos representing a single series:
${details}

Output JSON with:
- name: (String) English name.
- description: { zh, en, ms } (Chinese first then translate).
Ensure JSON is valid.`,

  REFINE_PHOTO: (detail: string) => `Refine this photo data: ${detail}`
};
