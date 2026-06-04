import { decrypt } from "../encryption.js";

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

export class AgnesProvider extends BaseAIProvider {
    name = "agnes";
    defaultModel = "agnes-ai";
    baseUrl = "https://apihub.agnes-ai.com/v1";

    async chat(messages: any[]): Promise<AIResponse> {
        try {
            const res = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model || this.defaultModel,
                    messages,
                    max_tokens: 1000
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || res.statusText);
            
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

export class OpenRouterProvider extends BaseAIProvider {
    name = "openrouter";
    defaultModel = "google/gemini-2.0-flash-exp:free";
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

export async function getAIProvider(providerName: string, supabase: any) {
    // 優先從 secrets 讀取
    const { data: secret } = await supabase.from('secrets').select('value').eq('name', providerName).maybeSingle();
    let apiKey = '';
    
    if (secret?.value) {
        apiKey = decrypt(secret.value);
    } else {
        // 兼容舊版本
        const { data: settings } = await supabase.from('settings').select('api_key').eq('id', 1).maybeSingle();
        if (providerName === 'openrouter' && settings?.api_key) {
            apiKey = settings.api_key;
        }
    }

    if (!apiKey) throw new Error(`未配置 ${providerName} 的 API 密鑰`);

    const { data: settings } = await supabase.from('settings').select('model_name').eq('id', 1).maybeSingle();
    const config = { apiKey, model: settings?.model_name };

    if (providerName === 'agnes') return new AgnesProvider(config);
    return new OpenRouterProvider(config);
}
