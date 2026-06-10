export const ANALYSIS_PROMPTS = {
    PRODUCT_ANALYSIS: (categories: any[], tags: any[]) => `
You are an expert furniture product classifier. 
Analyze the image and provide classification data.
Categories available: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name })))}
Tags available: ${JSON.stringify(tags.map(t => ({ id: t.id, name: t.name })))}

Strict constraints:
1. You MUST choose the most appropriate category_id from the list if it fits. If absolutely none fit, return null. "category_id": 必须是分类表中存在的 ID（字串或数字），不要返回分类名稱。
2. You CAN select multiple tags, return them all in tag_ids (existing ids form 'Tags available') or new_tags (newly generated tag names). We will filter them downstream.

Output ONLY valid JSON.
{
  "name": "string",
  "description": "string",
  "category_id": "string (the exact ID from Categories available, or null)",
  "tag_ids": ["string (ID form Tags available)"],
  "new_tags": ["string"],
  "manual_code": "string | null",
  "dimensions": []
}
`
};
