/**
 * AI Task Prompt Library
 * Centralized prompts for furniture analysis, grouping, and optimization (v2.0).
 */

export const AI_PROMPTS = {
  /**
   * Core image analysis to extract structured metadata
   */
  ANALYZE_PHOTO: (context: { categories: any[]; tags: any[]; groups: any[] }) => `Role: Elite Furniture Data Analyst.
Task: Inspect furniture image to extract comprehensive structured details.
【CORE DATA EXTRACTION】
- "name": "..." (Chinese name only)
- "category_id": ${JSON.stringify(context.categories)}
- "tag_ids": ${JSON.stringify(context.tags)}
- "group_id": ${JSON.stringify(context.groups)}

【PRECISE DIMENSIONS (OCR)】
- "dimensions": [{ "label": string, "length": number, "width": number, "height": number, "unit": string }]

【TRANSLATIONS】
- "description": "..." (Chinese description only)

Ensure raw JSON output.`,

  /**
   * Group analysis to create a unified series
   */
  ANALYZE_GROUP: (photoDetails: string) => `您是家具系列/合组设计与分析专家。
请根据以下单品列表的详细信息进行 analysis，生成一个具有整体性、设计感的家具系列/合组信息。

【输入单品列表】:
${photoDetails}

【任务要求】:
1. 分析单品之前的共同特征、设计风格（如北欧简约、现代轻奢、意式极简、美式复古等）、颜色搭配和材质关联。
2. 为这个家具组合（合组）起一个高雅、得体、契合其设计风格的中文系列名称。
3. 编写一段家具系列/合组的整体设计中文描述（总结其设计灵感、核心卖点、搭配建议、适用场景等，长度150-300字）。
4. 归档出这个系列的主要颜色（Colors）和材质（Materials）列表。

【JSON输出结构】:
必须只输出 RAW JSON，且符合以下格式（不要包裹任何 markdown 格式）：
{
  "name": "中文系列名称",
  "description": "系列整体描述",
  "colors": ["颜色1", "颜色2"],
  "materials": ["材质1", "材质2"]
}`,

  /**
   * Refine and expand existing photo metadata
   */
  REFINE_PHOTO: (photoDetail: string) => `您是高级家具产品优化与数据治理专家。
请对以下传入的现有家具单品零散信息进行分析、拓展与优化：

【家具现有信息】:
${photoDetail}

【任务要求】:
根据现有信息，为该家具产品进行智能补齐与翻译优化。
1. 优化产品名称（name）：起一个既包含产品核心类别也富有品质感、符合家具行业规范的名称。
2. 分析二级或主分类（category）：判定最适合的分类。
3. 补齐产品标签（tags）：列举3至5个最相关的细分属性或风格标签。
4. 识别并归档产品主要颜色（colors）与材质（materials）。
5. 编写一段精致产品中文描述（description，100-200字）。

【JSON输出结构】:
必须只输出 RAW JSON，且符合以下格式：
{
  "name": "优化后的家具名称",
  "category": "提取的家具分类名称",
  "tags": ["标签1", "标签2"],
  "colors": ["颜色1", "颜色2"],
  "materials": ["材质1", "材质2"],
  "description": "产品精致描述"
}`
};
