import { Hono } from 'hono';
import { getServerEnv } from '../shared/envSchema.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { getModel } from '../lib/ai/modelHelper.js';
import { getAIProvider, AgnesProvider, OpenRouterProvider } from '../lib/ai/providerFactory.js';
import { getTaskConfig, AITask } from '../lib/ai/taskRouter.js';
import { decrypt } from '../lib/encryption.js';

const serverEnv = getServerEnv(process.env);
export const ai = new Hono();

function extractJSON(text: string): any {
  if (!text) return {};
  const trimmed = text.trim();
  // 1. Try raw parsing
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // ignore and continue
  }

  // 2. Try cleaning standard markdown code sections
  let cleaned = trimmed.replace(/```(json|yaml)?\n?|```\n?|\n```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // ignore and continue
  }

  // 3. Match from the first brace to the last brace
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // ignore
    }
  }

  throw new Error("Failed to parse AI response as JSON: " + trimmed.substring(0, 300));
}

ai.post("/test", async (c) => {
    const { provider, apiKey, model } = await c.req.json();
    const supabase = await getSupabaseAdmin();
    
    let aiConfig: any;
    if (apiKey) {
        aiConfig = { apiKey, model };
    } else {
        const { data: secret } = await supabase.from('secrets').select('value').eq('key', provider).maybeSingle();
        if (!secret?.value) throw new Error(`未配置 ${provider} 的 API 密鑰`);
        aiConfig = { apiKey: decrypt(secret.value), model };
    }
    
    let aiProvider: any;
    if (provider === 'agnes') {
         if (!aiConfig.model) aiConfig.model = 'agnes-2.0-flash';
         aiProvider = new AgnesProvider(aiConfig);
    } else {
        if (!aiConfig.model) aiConfig.model = 'google/gemini-2.0-flash-exp:free';
        aiProvider = new OpenRouterProvider(aiConfig);
    }
    
    const result = await aiProvider.chat([{ role: 'user', content: 'Connection test' }]);
    if (!result.success) throw new Error(result.error);
    
    return c.json({ success: true, provider });
});

ai.post("/test/primary", async (c) => {
    const supabase = await getSupabaseAdmin();
    const { data: primarySecret } = await supabase.from('secrets').select('value').eq('key', 'PRIMARY_AI_PROVIDER').maybeSingle();
    const provider = primarySecret?.value || 'openrouter';
    
    const ai = await getAIProvider(provider, supabase);
    const result = await ai.chat([{ role: 'user', content: 'hi' }]);
    if (!result.success) throw new Error(result.error);
    
    return c.json({ success: true, provider });
});

ai.post("/run", async (c) => {
    const { task, imageUrl, prompt } = await c.req.json();
    const { provider, model, apiKeyKey } = await getTaskConfig(task as AITask);
    const supabase = await getSupabaseAdmin();
    
    const { data: secret } = await supabase.from('secrets').select('value').eq('key', apiKeyKey).maybeSingle();
    if (!secret?.value) throw new Error(`未配置 ${provider} 的 API 密鑰`);
    const apiKey = decrypt(secret.value);

    const ai = await getAIProvider(provider, supabase, model);
    
    let messages = [];
    if (imageUrl) {
         messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: prompt || 'Analyze this image' }]});
    } else {
         messages.push({ role: 'user', content: prompt });
    }

    const result = await ai.chat(messages);
    return c.json(result);
});

ai.post("/analyze", async (c) => {
    try {
        const { photoId, imageUrl } = await c.req.json();
        const supabase = await getSupabaseAdmin();
        
        let finalImageUrl = imageUrl;

        if (photoId) {
            const { data: photo } = await supabase.from('furniture_items').select('image_url').eq('id', photoId).single();
            if (photo) {
                finalImageUrl = photo.image_url;
            }
        }

        if (!finalImageUrl) throw new Error("Image URL is required for analysis");

        const [
            { data: categories },
            { data: tags },
            { data: groups },
            { data: openrouterSecret },
        ] = await Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('tags').select('*'),
            supabase.from('groups').select('id, name').order('created_at', { ascending: false }).limit(40),
            supabase.from('secrets').select('value').eq('key', 'openrouter').maybeSingle(),
        ]);

        let apiKey = '';
        if (openrouterSecret?.value) {
            apiKey = decrypt(openrouterSecret.value);
        } else {
            apiKey = serverEnv.GEMINI_API_KEY || '';
        }

        if (!apiKey) throw new Error("OpenRouter API Key or GEMINI_API_KEY not configured in environment or secrets");
        
        const model = await getModel(supabase);

        const provider = new OpenRouterProvider({ apiKey, model });
        
        const categoriesContext = (categories || []).map(c => ({ id: c.id, name: c.name, zh: c.zh })).slice(0, 50);
        const tagsContext = (tags || []).map(t => ({ id: t.id, name: t.name, aliases: t.aliases })).slice(0, 100);
        const groupsContext = (groups || []).map(g => ({ id: g.id, name: typeof g.name === 'object' ? g.name.zh : g.name }));
        
        const prompt = `Role: Elite Furniture Data Analyst.
Task: Inspect furniture image to extract comprehensive structured details.
【CORE DATA EXTRACTION】
- "name": {"zh": "...", "en": "...", "ms": "..."}
- "category_id": ${JSON.stringify(categoriesContext)}
- "tag_ids": ${JSON.stringify(tagsContext)}
- "group_id": ${JSON.stringify(groupsContext)}

【PRECISE DIMENSIONS (OCR)】
- "dimensions": [{ "label": string, "length": number, "width": number, "height": number, "unit": string }]

【TRANSLATIONS】
- "description": {"zh": "...", "en": "...", "ms": "..."}

Ensure raw JSON output.`;

        const messages = [
            { role: 'user', content: [
                { type: 'image_url', image_url: { url: finalImageUrl } },
                { type: 'text', text: prompt }
            ]}
        ];

        const aiResult = await provider.chat(messages);
        if (!aiResult.success) throw new Error(aiResult.error);

        let data: any;
        try {
            data = extractJSON(aiResult.text || '');
        } catch (e) {
            throw new Error("AI returned invalid JSON format: " + (aiResult.text || '').substring(0, 200));
        }

        return c.json({ success: true, data });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

ai.post("/analyze-base64", async (c) => {
    try {
      const { base64Image, customModel, promptText } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);

      let modelName = customModel || await getModel(await getSupabaseAdmin());

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "X-Title": "PhotoX AI" },
        body: JSON.stringify({ model: modelName.replace('openrouter/', ''), messages: [{ role: "user", content: [{ type: "text", text: promptText }, { type: "image_url", image_url: { url: base64Image } } ] }], response_format: { type: "json_object" }, max_tokens: 1024 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      return c.json(await response.json());
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

ai.post("/translate", async (c) => {
    try {
      const { customModel, promptText } = await c.req.json();
      const apiKey = serverEnv.GEMINI_API_KEY;
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);

      let modelName = customModel || await getModel(await getSupabaseAdmin());

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelName.replace('openrouter/', ''), messages: [{ role: "user", content: promptText }], max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      const rawContent = data.choices[0]?.message?.content || "{}";
      const parsedData = extractJSON(rawContent);
      return c.json(parsedData);
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

ai.post("/analyze-group", async (c) => {
    try {
      const { photoDetails } = await c.req.json();
      const supabase = await getSupabaseAdmin();
      const { data: openrouterSecret } = await supabase.from('secrets').select('value').eq('key', 'openrouter').maybeSingle();
      let apiKey = '';
      if (openrouterSecret?.value) {
        apiKey = decrypt(openrouterSecret.value);
      } else {
        apiKey = serverEnv.GEMINI_API_KEY || '';
      }
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      
      const prompt = `您是家具系列/合组设计与分析专家。
请根据以下单品列表的详细信息进行 analysis，生成一个具有整体性、设计感的家具系列/合组信息。

【输入单品列表】:
${photoDetails}

【任务要求】:
1. 分析单品之前的共同特征、设计风格（如北欧简约、现代轻奢、意式极简、美式复古等）、颜色搭配和材质关联。
2. 为这个家具组合（合组）起一个高雅、得体、契合其设计风格的系列名称（包含中文、英文和马来文）。
3. 编写一段家具系列/合组的整体设计描述（总结其设计灵感、核心卖点、搭配建议、适用场景等，长度150-300字）。
4. 归纳出这个系列的主要颜色（Colors）和材质（Materials）列表。

【JSON输出结构】:
必须只输出 RAW JSON，且符合以下格式（不要包裹任何 markdown 格式）：
{
  "name": {
    "zh": "中文系列名称，例如：'极简爵士白大理石餐桌椅系列'",
    "en": "English Series Name, e.g., 'Minimalist Jazz White Marble Dining Suite'",
    "ms": "Malay Series Name, e.g., 'Siri Ruang Makan Marmar Jazz Putih Minimalis'"
  },
  "description": "系列整体中文描述内容，请尽量使用精练优雅的语言表达系列的高级质感。",
  "colors": ["浅灰色", "爵士白", "哑光黑"],
  "materials": ["大理石", "不锈钢", "岩板", "真皮"]
}`;
      const model = await getModel(supabase);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      const rawContent = data.choices[0]?.message?.content || "{}";
      const parsedData = extractJSON(rawContent);
      return c.json(parsedData);
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});

ai.post("/analyze-photo-v2", async (c) => {
    try {
      const { photoDetail } = await c.req.json();
      const supabase = await getSupabaseAdmin();
      const { data: openrouterSecret } = await supabase.from('secrets').select('value').eq('key', 'openrouter').maybeSingle();
      let apiKey = '';
      if (openrouterSecret?.value) {
        apiKey = decrypt(openrouterSecret.value);
      } else {
        apiKey = serverEnv.GEMINI_API_KEY || '';
      }
      if (!apiKey) return c.json({ error: "Server API key not configured" }, 500);
      
      const prompt = `您是高级家具产品优化与数据治理专家。
请对以下传入的现有家具单品零散信息进行分析、拓展与优化：

【家具现有信息】:
${photoDetail}

【任务要求】:
根据现有信息，为该家具产品进行智能补齐与翻译优化。
1. 优化产品名称（name）：起一个既包含产品核心类别也富有品质感、符合家具行业规范的名称。
2. 分析二级或主分类（category）：判定最适合的分类（如：餐椅, 餐桌, 茶几, 电视柜, 沙发, 床, 衣柜, 书台, 鞋柜...）。
3. 补齐产品标签（tags）：列举3至5个最相关的细分属性或风格标签（如：极简, 轻奢, 实木, 大理石, 复古, 现代, 意式...）。
4. 识别并归纳产品主要颜色（colors）与材质（materials）。
5. 编写一段吸引人、突出产品优点、材质工艺与适用场景的精致产品中文描述（description，100-200字）。

【JSON输出结构】:
必须只输出 RAW JSON，且符合以下格式（不要包裹任何 markdown 格式）：
{
  "name": "优化后的家具名称",
  "category": "提取的家具分类名称",
  "tags": ["标签1", "标签2", "标签3"],
  "colors": ["颜色1", "颜色2"],
  "materials": ["材质1", "材质2"],
  "description": "家具产品的精致中文描述文本"
}`;
      const model = await getModel(supabase);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      const rawContent = data.choices[0]?.message?.content || "{}";
      const parsedData = extractJSON(rawContent);
      return c.json(parsedData);
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});
