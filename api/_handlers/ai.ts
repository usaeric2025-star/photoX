import { Hono } from 'hono';
import { type } from 'arktype';
import { getServerEnv } from '../_shared/envSchema.js';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { getAIProvider, OpenRouterProvider, AgnesProvider, BaseAIProvider } from '../_lib/ai/providerFactory.js';
import { decrypt } from '../_lib/encryption.js';
import { executeAITask } from '../_lib/ai/executor.js';
import { processGroupAnalysis } from './ai/groupAnalysis.js';
import { 
    AIAnalyzeV1ReqSchema, 
    AIRunReqSchema, 
    AIAnalyzeBase64ReqSchema, 
    AITranslateReqSchema,
    AIAnalyzeGroupReqSchema,
    AIAnalyzePhotoV2ReqSchema,
    AIClusterPhotosReqSchema,
    ApiResponse,
    JsonObject
} from '../_shared/apiContractSchema.js';
import { AI_PROMPTS } from './ai/prompts.js';

interface HonoContextUser {
    id: string;
    email?: string;
}

interface GroupInsertData {
    id: string;
    name: { zh: string; en: string; ms: string };
    status: string;
    created_at: string;
    user_id?: string;
}

interface DBGroup {
    id: string;
    name: string | JsonObject;
    status: string;
    created_at: string;
}

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

        const data = await Promise.race([chatPromise, timeoutPromise]) as { success: boolean; error?: unknown; text?: string };
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
        const modelConfig = (provider as BaseAIProvider).getConfig().model;
        const model = modelConfig || 'google/gemini-2.5-flash-lite'; // Ensure non-nullable
        
        const messages = imageUrl 
            ? [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: prompt || 'Analyze this image' }]}]
            : [{ role: 'user', content: prompt || "" }];

        const { data, rawText } = await executeAITask({
            task: (task || 'run') as string,
            provider,
            model,
            messages,
            prompt: prompt || 'Analyze this image',
            metadata: { imageUrl },
            shouldNormalize: false
        });

        return c.json({ success: true, text: data as string, raw_result: rawText, usage: {} } as ApiResponse);
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
            supabase.from('groups').select('id, name, status').eq('status', 'confirmed').order('created_at', { ascending: false }).limit(40),
        ]);

        const provider = await getAIProvider('', supabase);
        const modelConfig = (provider as BaseAIProvider).getConfig().model;
        const model = modelConfig || 'google/gemini-2.5-flash-lite';
        
        const context = {
            categories: (catRef.data || []).map((c: { id: string; name: string; zh: string }) => ({ id: c.id, name: c.name, zh: c.zh })).slice(0, 50),
            tags: (tagRef.data || []).map((t: { id: string; name: string; aliases: string[] }) => ({ id: t.id, name: t.name, aliases: t.aliases })).slice(0, 100),
            groups: (groupRef.data || []).map((g: { id: string; name: string | { zh: string } }) => ({ id: g.id, name: typeof g.name === 'object' ? g.name.zh : g.name })),
        };
        
        const prompt = AI_PROMPTS.ANALYZE_PHOTO(context);
        const messages = [{ role: 'user', content: [{ type: 'image_url', image_url: { url: finalImageUrl } }, { type: 'text', text: prompt }]}];

        const { data, rawText } = await executeAITask({
            task: 'analyze',
            provider,
            model,
            messages,
            prompt,
            metadata: { photoId, imageUrl: finalImageUrl }
        });

        if (data && (data as { _fallback?: boolean })._fallback) {
            throw new Error((data as { _error?: string })._error || 'AI analysis failed');
        }

        return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
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
      const provider = await getAIProvider('', supabase, customModel);
      const modelConfig = (provider as BaseAIProvider).getConfig().model;
      const model = modelConfig || 'google/gemini-2.5-flash-lite';

      const { data, rawText } = await executeAITask({
          task: 'analyze-base64',
          provider,
          model,
          messages: [{ role: "user", content: [{ type: "text", text: promptText || "Analyze this image" }, { type: "image_url", image_url: { url: base64Image } }] }],
          prompt: promptText || "Analyze this image",
          metadata: { type: 'base64' }
      });

      if (data && (data as { _fallback?: boolean })._fallback) {
          throw new Error((data as { _error?: string })._error || 'AI base64 analysis failed');
      }

      return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' } as ApiResponse, 500); 
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
      const modelConfig = (provider as BaseAIProvider).getConfig().model;
      const model = modelConfig || 'google/gemini-2.5-flash-lite';

      const { data, rawText } = await executeAITask({
          task: 'translate',
          provider,
          model,
          messages: [{ role: "user", content: promptText }],
          prompt: promptText,
          shouldNormalize: false
      });

      if (data && (data as { _fallback?: boolean })._fallback) {
          throw new Error((data as { _error?: string })._error || 'AI translation failed');
      }

      return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown AI error' } as ApiResponse, 500); 
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
      const modelConfig = (provider as BaseAIProvider).getConfig().model;
      const model = modelConfig || 'google/gemini-2.5-flash-lite';

      const { data, rawText } = await executeAITask({
          task: 'analyze-group',
          provider,
          model,
          messages: [{ role: "user", content: prompt }],
          prompt
      });

      if (data && (data as { _fallback?: boolean })._fallback) {
          throw new Error((data as { _error?: string })._error || 'AI group analysis failed');
      }

      return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown AI error' } as ApiResponse, 500); 
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
      const modelConfig = (provider as BaseAIProvider).getConfig().model;
      const model = modelConfig || 'google/gemini-2.5-flash-lite';

      const { data, rawText } = await executeAITask({
          task: 'analyze-photo-v2',
            provider,
            model,
            messages: [{ role: "user", content: prompt }],
            prompt,
            metadata: { photoId: check.photoId }
        });

      if (data && (data as { _fallback?: boolean })._fallback) {
          throw new Error((data as { _error?: string })._error || 'AI refine photo failed');
      }

        return c.json({ success: true, data, raw_result: rawText } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown AI error' } as ApiResponse, 500); 
    }
});

ai.post("/cluster-photos", async (c) => {
    try {
        const body = await c.req.json();
        const check = AIClusterPhotosReqSchema(body);
        if (check instanceof type.errors) throw new Error(check.summary);

        const supabase = await getSupabaseAdmin();
        const user = (c as { get: (key: string) => HonoContextUser | undefined }).get('user');
        const userId = user?.id; // 從 requireRealUser 中獲獲的用戶 ID

        // 1. AI 識別
        const parsed = await processGroupAnalysis(check.photoIds);
        const createdGroups: DBGroup[] = [];

        // Optimize: Fetch a valid user_id from the source photos
        let dbUserId: string | undefined = undefined;
        if (check.photoIds && check.photoIds.length > 0) {
            const { data: sourcePhotos } = await supabase.from('furniture_items').select('user_id').in('id', check.photoIds).limit(1).maybeSingle();
            if (sourcePhotos?.user_id) {
                dbUserId = sourcePhotos.user_id as string;
            }
        }

        // 2. 事務性寫入 (手動類比)
        for (const g of parsed.groups) {
            const groupId = crypto.randomUUID();
            
            const insertGroupData: GroupInsertData = {
                id: groupId,
                name: { zh: g.name, en: g.name_en, ms: g.name_ms },
                status: 'confirmed',
                created_at: new Date().toISOString()
            };
            
            let finalUserId = (userId && userId !== 'staff') ? userId : dbUserId;
            if (!finalUserId) {
               const { data: userRecord } = await supabase.from('users').select('id').limit(1).maybeSingle();
               finalUserId = userRecord?.id || '8ec53131-a589-4b50-beb4-6b5308541e1b';
            }
            insertGroupData.user_id = finalUserId;

            // 寫入 groups 表為 draft
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .insert(insertGroupData)
                .select()
                .single();

            if (groupError) throw groupError;

            // 關聯照片
            const { error: photoError } = await supabase
                .from('furniture_items')
                .update({ group_id: groupId })
                .in('id', g.photoIds);

            if (photoError) throw photoError;

            createdGroups.push(groupData);
        }

        // 3. 記錄操作日誌 (可在大併發後異步，這裡同步保險)
        await supabase.from('group_correction_logs').insert({
            operation: 'ai_cluster',
            input_photo_ids: check.photoIds,
            created_groups: createdGroups.map(g => g.id),
            user_id: userId,
            created_at: new Date().toISOString()
        } as any);

        return c.json({ success: true, data: createdGroups } as ApiResponse);
    } catch (error: unknown) { 
        return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' } as ApiResponse, 500); 
    }
});
