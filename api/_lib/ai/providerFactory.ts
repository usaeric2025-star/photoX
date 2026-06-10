import { decrypt } from "../encryption.js";
import { getServerEnv } from "../../_shared/envSchema.js";

export const getModel = async (supabase?: any, customModel?: string, providerName?: string): Promise<string> => {
    if (customModel) return customModel;

    let targetProvider = providerName || 'openrouter';

    if (supabase) {
        try {
            // First check secrets table for provider specific model
            const { data: secretData } = await supabase.from('secrets').select('value').eq('key', `${targetProvider}_model`).maybeSingle();
            if (secretData?.value) return secretData.value;
            
            // Fallback to legacy custom_model setting
            const { data } = await supabase.from('settings').select('custom_model').eq('id', 1).maybeSingle();
            if (data?.custom_model) return data.custom_model;
        } catch (e) {
            console.warn("[getModel] could not fetch custom model:", e);
        }
    }

    try {
        const env = getServerEnv(process.env as any);
        if ((env as any).DEFAULT_AI_MODEL) return (env as any).DEFAULT_AI_MODEL;
    } catch {}

    return targetProvider === 'openrouter' ? 'google/gemini-2.5-flash-lite' : 'gemini-2.0-flash-exp';
};

export interface AIResponse {
    success: boolean;
    text?: string;
    error?: string;
    usage?: any;
}

export interface AIProviderConfig {
    apiKey: string;
    model?: string;
}

export abstract class BaseAIProvider {
    abstract name: string;
    abstract defaultModel: string;
    abstract baseUrl: string;

    constructor(protected config: AIProviderConfig) {}

    protected async fetchWithTimeout(url: string, options: RequestInit, timeout = 15000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    }

    abstract chat(messages: any[]): Promise<AIResponse>;
}

export class OpenRouterProvider extends BaseAIProvider {
    name = "openrouter";
    defaultModel = "google/gemini-2.5-flash-lite";
    baseUrl = "https://openrouter.ai/api/v1";

    async chat(messages: any[]): Promise<AIResponse> {
        try {
            const res = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'HTTP-Referer': 'https://photox.agnes-ai.com',
                    'X-Title': 'PhotoX Manager'
                },
                body: JSON.stringify({
                    model: this.config.model || this.defaultModel,
                    messages
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || data.error || res.statusText);

            return {
                success: true,
                text: data.choices?.[0]?.message?.content,
                usage: data.usage
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
}

export class AgnesProvider extends BaseAIProvider {
    name = "agnes";
    defaultModel = "gemini-2.0-flash-exp";
    baseUrl = "https://apihub.agnes-ai.com/v1";

    async chat(messages: any[]): Promise<AIResponse> {
        try {
            // Agnes API uses OpenAI format, not Gemini's native format
            const res = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model || this.defaultModel,
                    messages
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || data.error || res.statusText);

            return {
                success: true,
                text: data.choices?.[0]?.message?.content,
                usage: data.usage
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
}

export async function getAIProvider(providerName: string, supabase: any, modelOverride?: string) {
    // 從 secrets 讀取首选供應商
    const { data: primary } = await supabase.from('secrets').select('value').eq('key', 'PRIMARY_AI_PROVIDER').maybeSingle();
    let actualProvider = providerName || primary?.value || 'openrouter';

    // 從 secrets 讀取統一格式的 API Key
    let { data: secret } = await supabase.from('secrets').select('value').eq('key', actualProvider).maybeSingle();

    let apiKey = '';
    
    if (secret?.value) {
        apiKey = decrypt(secret.value);
    }

    // Fallback logic for legacy settings table
    if (!apiKey) {
        try {
            const { data: settings, error: settingsErr } = await supabase.from('settings').select('gemini_api_key').maybeSingle();
            if (!settingsErr && settings?.gemini_api_key) {
               // Basic heuristic to decide if the legacy key belongs to this provider
               if (actualProvider === 'openrouter' && settings.gemini_api_key.startsWith('sk-or-')) {
                   apiKey = decrypt(settings.gemini_api_key);
               } else if (actualProvider === 'agnes' && !settings.gemini_api_key.startsWith('sk-or-')) {
                   apiKey = decrypt(settings.gemini_api_key);
               }
            }
        } catch (e) {
            console.warn("Legacy settings lookup failed:", e);
        }
    }

    if (!apiKey) throw new Error(`未配置 ${actualProvider} API 密鑰`);

    let model = modelOverride;
    if (model && actualProvider === 'openrouter' && !model.includes('/')) {
        model = 'google/' + model;
    }
    if (!model) {
        model = await getModel(supabase, undefined, actualProvider);
    }
    
    console.log(`[getAIProvider] Using ${actualProvider} with model: ${model}`);  
    const config = { apiKey, model };

    if (actualProvider === 'agnes') {
        return new AgnesProvider(config);
    }
    return new OpenRouterProvider(config);
}
