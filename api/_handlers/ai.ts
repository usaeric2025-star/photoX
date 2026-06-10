import { Hono } from 'hono';
import { type } from 'arktype';
import { getServerEnv } from '../_shared/envSchema.js';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { getAIProvider, OpenRouterProvider, AgnesProvider } from '../_lib/ai/providerFactory.js';
import { decrypt } from '../_lib/encryption.js';
import { executeAITask } from '../_lib/ai/executor.js';
import { 
    AIAnalyzeV1ReqSchema, 
    AIRunReqSchema, 
    AIAnalyzeBase64ReqSchema, 
    AITranslateReqSchema,
    AIAnalyzeGroupReqSchema,
    AIAnalyzePhotoV2ReqSchema,
    ApiResponse
} from '../_shared/apiContractSchema.js';
import { AI_PROMPTS } from './ai/prompts.js';

const serverEnv = getServerEnv(process.env);
export const ai = new Hono();

ai.post("/test", async (c) => {
    try {
        const body = await c.req.json();
        let { provider: providerName, apiKey, model } = body;
        
        if (apiKey) apiKey = String(apiKey).trim();

        let provider;
        if (apiKey) {
            if (providerName === 'agnes') {
                provider = new AgnesProvider({ apiKey, model: model || 'gemini-2.0-flash-exp' });
            } else {
                provider = new OpenRouterProvider({ apiKey, model: model || 'google/gemini-2.5-flash-lite' });
            }
        } else {
            const supabase = await getSupabaseAdmin();
            // Pass providerName or undefined to use primary
            provider = await getAIProvider(providerName, supabase, model);
        }

        // Add a timeout for the test connection to avoid long hangs
        const chatPromise = provider.chat([{ role: 'user', content: 'test connection' }]);
        const timeoutPromise = new Promise<{ success: false; error: string }>((_, reject) => 
            setTimeout(() => reject(new Error('AI 連線測試超時 (15s)')), 15000)
        );

        const data = await Promise.race([chatPromise, timeoutPromise]) as any;
        if (!data.success) {
            const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error || 'Unknown AI error');
            throw new Error(errorMsg);
        }

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
        const supabase = await getSupabaseAdmin();
        const provider = await getAIProvider('', supabase);
        const model = (provider as any).config.model; // Since we need it for logging
        
        const messages = imageUrl 
            ? [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: prompt || 'Analyze this image' }]}]
            : [{ role: 'user', content: prompt || "" }];

        const data = await executeAITask({
            task: (task || 'run') as string,
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

        const [catRef, tagRef, groupRef] = await Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('tags').select('*'),
            supabase.from('groups').select('id, name').order('created_at', { ascending: false }).limit(40),
        ]);

        const provider = await getAIProvider('', supabase);
        const model = (provider as any).config.model;
        
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

        if (data && (data as any)._fallback) {
            throw new Error((data as any)._error || 'AI analysis failed');
        }

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
      const provider = await getAIProvider('', supabase, check.customModel);
      const model = (provider as any).config.model;

      const data = await executeAITask({
          task: 'analyze-base64',
          provider,
          model,
          messages: [{ role: "user", content: [{ type: "text", text: promptText || "Analyze this image" }, { type: "image_url", image_url: { url: base64Image } }] }],
          prompt: promptText || "Analyze this image",
          metadata: { type: 'base64' }
      });

      if (data && (data as any)._fallback) {
          throw new Error((data as any)._error || 'AI base64 analysis failed');
      }

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
      const provider = await getAIProvider('', supabase, check.customModel);
      const model = (provider as any).config.model;

      const data = await executeAITask({
          task: 'translate',
          provider,
          model,
          messages: [{ role: "user", content: promptText }],
          prompt: promptText,
          shouldNormalize: false
      });

      if (data && (data as any)._fallback) {
          throw new Error((data as any)._error || 'AI translation failed');
      }

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
      const provider = await getAIProvider('', supabase);
      const model = (provider as any).config.model;

      const data = await executeAITask({
          task: 'analyze-group',
          provider,
          model,
          messages: [{ role: "user", content: prompt }],
          prompt
      });

      if (data && (data as any)._fallback) {
          throw new Error((data as any)._error || 'AI group analysis failed');
      }

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
      const provider = await getAIProvider('', supabase);
      const model = (provider as any).config.model;

      const data = await executeAITask({
          task: 'analyze-photo-v2',
            provider,
            model,
            messages: [{ role: "user", content: prompt }],
            prompt
        });

      if (data && (data as any)._fallback) {
          throw new Error((data as any)._error || 'AI refine photo failed');
      }

        return c.json({ success: true, data } as ApiResponse);
    } catch (error: any) { 
        return c.json({ success: false, error: error.message } as ApiResponse, 500); 
    }
});
