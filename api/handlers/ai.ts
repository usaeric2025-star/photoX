import { Hono } from 'hono';
import { getServerEnv } from '../shared/envSchema.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { getModel } from '../lib/ai/modelHelper.js';
import { getAIProvider, AgnesProvider, OpenRouterProvider } from '../lib/ai/providerFactory.js';
import { getTaskConfig, AITask } from '../lib/ai/taskRouter.js';
import { decrypt } from '../lib/encryption.js';

const serverEnv = getServerEnv(process.env);
export const ai = new Hono();

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

        if (!openrouterSecret?.value) throw new Error("OpenRouter API Key not configured in secrets");
        
        const apiKey = decrypt(openrouterSecret.value);
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
            const cleanJson = (aiResult.text || '').replace(/```json\n|\n```|```/g, '').trim();
            data = JSON.parse(cleanJson);
        } catch (e) {
            throw new Error("AI returned invalid JSON format");
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
      return c.json(JSON.parse(data.choices[0]?.message?.content || "{}"));
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
      
      const prompt = `系列分析专家...系列名称, 描述, 颜色, 材质... 单品列表: ${photoDetails}`;
      const model = await getModel(supabase);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      const rawContent = data.choices[0]?.message?.content || "{}";
      const cleanContent = rawContent.replace(/```json\n?|```\n?|\n```/g, "").trim();
      return c.json(JSON.parse(cleanContent));
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
      
      const prompt = `产品优化专家... JSON结构: name, category, tags, colors, materials, description. 信息: ${photoDetail}`;
      const model = await getModel(supabase);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, max_tokens: 1000 })
      });
      if (!response.ok) return c.json({ error: await response.text() }, response.status as any);
      const data = await response.json();
      const rawContent = data.choices[0]?.message?.content || "{}";
      const cleanContent = rawContent.replace(/```json\n?|```\n?|\n```/g, "").trim();
      return c.json(JSON.parse(cleanContent));
    } catch (error: any) { return c.json({ error: error.message }, 500); }
});
