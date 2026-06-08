export const ANALYSIS_PROMPTS = {
    PRODUCT_ANALYSIS: (categories: any[], tags: any[]) => `
You are an expert furniture product classifier. 
Analyze the image and provide classification data.
Categories available: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name })))}
Tags available: ${JSON.stringify(tags.map(t => ({ id: t.id, name: t.name })))}

Output ONLY valid JSON.
{
  "name": "string",
  "description": "string",
  "category_id": "string | null",
  "tag_ids": ["string"],
  "new_tags": ["string"],
  "manual_code": "string | null",
  "dimensions": []
}
`
};
