import { Hono } from 'hono';
import { type } from 'arktype';
import { getServerEnv } from '../_shared/envSchema';
import { getSupabaseAdmin } from '../_lib/supabase';
import { getModel } from '../_lib/ai/modelHelper';
import { getAIProvider, OpenRouterProvider, GeminiProvider } from '../_lib/ai/providerFactory';
import { getTaskConfig, AITask } from '../_lib/ai/taskRouter';
import { decrypt } from '../_lib/encryption';
import { executeAITask } from '../_lib/ai/executor';
import { 
    AIAnalyzeV1ReqSchema, 
    AIRunReqSchema, 
    AIAnalyzeBase64ReqSchema, 
    AITranslateReqSchema,
    AIAnalyzeGroupReqSchema,
    AIAnalyzePhotoV2ReqSchema,
    ApiResponse
} from '../_shared/apiContractSchema';
import { AI_PROMPTS } from './ai/prompts';

const serverEnv = getServerEnv(process.env);
export const ai = new Hono();

ai.post("/test", async (c) => {
    try {
        const body = await c.req.json();
        const { provider: providerName, apiKey, model } = body;
        
        let provider;
        if (apiKey) {
            if (providerName === 'gemini') {
                provider = new GeminiProvider({ apiKey, model: model || 'gemini-1.5-flash' });
            } else {
                provider = new OpenRouterProvider({ apiKey, model: model || 'google/gemini-2.5-flash-lite' });
            }
        } else {
            const supabase = await getSupabaseAdmin();
            // Pass providerName or undefined to use primary
            provider = await getAIProvider(providerName, supabase, model);
        }

        const data = await provider.chat([{ role: 'user', content: 'test connection' }]);
        if (!data.success) throw new Error(data.error);

        return c.json({ success: true, message: 'Connection successful', data: data.text });
    } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});

ai.post("/run", async (c) => {
    try {
        const body = await c.req.json();
        const check = AIRunReqSchema(body);
        if (check instanceof type.errors) throw new Error(check.summary);
        
        const { task, imageUrl, prompt } = check;
        const { provider: providerName, model } = await getTaskConfig(task as AITask);
        const supabase = await getSupabaseAdmin();
        const provider = await getAIProvider(providerName, supabase, model);
        
        const messages = imageUrl 
            ? [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: prompt || 'Analyze this image' }]}]
            : [{ role: 'user', content: prompt || "" }];

        const data = await executeAITask({
            task: (task || 'run') as AITask,
            provider,
            model,
            messages,
            prompt: prompt || 'Analyze this image',
            metadata: { imageUrl },
            shouldNormalize: false
        });

        return c.json({ success: true, text: data, usage: {} } as ApiResponse);
    } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' } as ApiResponse, 500);
    }
});

ai.post("/analyze", async (c) => {
    try {
        const body = await c.req.json();
        const check = AIAnalyzeV1ReqSchema(body);
        if (check instanceof type.errors) throw new Error(check.summary);

        const { photoId, imageUrl } = check;
        const supabase = await getSupabaseAdmin();
        let finalImageUrl = imageUrl;

        if (photoId) {
            const { data: photo } = await supabase.from('furniture_items').select('image_url').eq('id', photoId).single();
            if (photo) finalImageUrl = photo.image_url;
        }

        if (!finalImageUrl) throw new Error("Image URL is required for analysis");

        const [catRef, tagRef, groupRef, secretRef] = await Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('tags').select('*'),
            supabase.from('groups').select('id, name').order('created_at', { ascending: false }).limit(40),
            supabase.from('secrets').select('value').eq('key', 'openrouter').maybeSingle(),
        ]);

        const apiKey = secretRef.data?.value ? decrypt(secretRef.data.value) : (serverEnv.GEMINI_API_KEY || '');
        if (!apiKey) throw new Error("AI API Key not configured");
        
        const model = await getModel(supabase);
        const provider = new OpenRouterProvider({ apiKey, model });
        
        const context = {
            categories: (catRef.data || []).map((c: any) => ({ id: c.id, name: c.name, zh: c.zh })).slice(0, 50),
            tags: (tagRef.data || []).map((t: any) => ({ id: t.id, name: t.name, aliases: t.aliases })).slice(0, 100),
            groups: (groupRef.data || []).map((g: any) => ({ id: g.id, name: typeof g.name === 'object' ? g.name.zh : g.name })),
        };
        
        const prompt = AI_PROMPTS.ANALYZE_PHOTO(context);
        const messages = [{ role: 'user', content: [{ type: 'image_url', image_url: { url: finalImageUrl } }, { type: 'text', text: prompt }]}];

        const data = await executeAITask({
            task: 'analyze',
            provider,
            model,
            messages,
            prompt,
            metadata: { photoId, imageUrl: finalImageUrl }
        });

        return c.json({ success: true, data } as ApiResponse);
    } catch (e: unknown) {
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' } as ApiResponse, 500);
    }
});

ai.post("/analyze-base64", async (c) => {
    try {
      const body = await c.req.json();
      const check = AIAnalyzeBase64ReqSchema(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const { base64Image, customModel, promptText } = check;
      const supabase = await getSupabaseAdmin();
      const model = customModel || await getModel(supabase);
      const provider = await getAIProvider('openrouter', supabase, model);

      const data = await executeAITask({
          task: 'analyze-base64',
          provider,
          model,
          messages: [{ role: "user", content: [{ type: "text", text: promptText || "Analyze this image" }, { type: "image_url", image_url: { url: base64Image } }] }],
          prompt: promptText || "Analyze this image",
          metadata: { type: 'base64' }
      });

      return c.json({ success: true, data } as ApiResponse);
    } catch (error: any) { 
        return c.json({ success: false, error: error.message } as ApiResponse, 500); 
    }
});

ai.post("/translate", async (c) => {
    try {
      const body = await c.req.json();
      const check = AITranslateReqSchema(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const { customModel, promptText } = check;
      const supabase = await getSupabaseAdmin();
      const model = customModel || await getModel(supabase) || "gemini-2.5-flash-lite";
      const provider = await getAIProvider('openrouter', supabase, model);

      const data = await executeAITask({
          task: 'translate',
          provider,
          model,
          messages: [{ role: "user", content: promptText }],
          prompt: promptText,
          shouldNormalize: false
      });

      return c.json({ success: true, data } as ApiResponse);
    } catch (error: any) { 
        return c.json({ success: false, error: error.message } as ApiResponse, 500); 
    }
});

ai.post("/analyze-group", async (c) => {
    try {
      const body = await c.req.json();
      const check = AIAnalyzeGroupReqSchema(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const supabase = await getSupabaseAdmin();
      const prompt = AI_PROMPTS.ANALYZE_GROUP(check.photoDetails);
      const model = await getModel(supabase);
      const provider = await getAIProvider('openrouter', supabase, model);

      const data = await executeAITask({
          task: 'analyze-group',
          provider,
          model,
          messages: [{ role: "user", content: prompt }],
          prompt
      });

      return c.json({ success: true, data } as ApiResponse);
    } catch (error: any) { 
        return c.json({ success: false, error: error.message } as ApiResponse, 500); 
    }
});

ai.post("/analyze-photo-v2", async (c) => {
    try {
      const body = await c.req.json();
      const check = AIAnalyzePhotoV2ReqSchema(body);
      if (check instanceof type.errors) throw new Error(check.summary);

      const supabase = await getSupabaseAdmin();
      const prompt = AI_PROMPTS.REFINE_PHOTO(check.photoDetail);
      const model = await getModel(supabase);
      const provider = await getAIProvider('openrouter', supabase, model);

      const data = await executeAITask({
          task: 'analyze-photo-v2',
            provider,
            model,
            messages: [{ role: "user", content: prompt }],
            prompt
        });

        return c.json({ success: true, data } as ApiResponse);
    } catch (error: any) { 
        return c.json({ success: false, error: error.message } as ApiResponse, 500); 
    }
});
