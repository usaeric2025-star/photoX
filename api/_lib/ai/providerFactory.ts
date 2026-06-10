import { decrypt } from "../encryption.js";
import { getModel } from "./modelHelper.js";

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

export class GeminiProvider extends BaseAIProvider {
    name = "gemini";
    defaultModel = "gemini-1.5-flash";
    baseUrl = "https://generativelanguage.googleapis.com/v1beta";

    async chat(messages: any[]): Promise<AIResponse> {
        try {
            // Transform OpenAI-style messages to Gemini if necessary
            // For simple test, we just assume text-only or simple structure
            const contents = messages.map(m => {
                let parts = [];
                if (typeof m.content === 'string') {
                    parts = [{ text: m.content }];
                } else if (Array.isArray(m.content)) {
                    parts = m.content.map((c: any) => {
                        if (c.type === 'text') return { text: c.text };
                        if (c.type === 'image_url') {
                            const base64Match = c.image_url.url.match(/^data:image\/(\w+);base64,(.+)$/);
                            if (base64Match) {
                                return {
                                    inline_data: {
                                        mime_type: `image/${base64Match[1]}`,
                                        data: base64Match[2]
                                    }
                                };
                            }
                        }
                        return { text: '[Unsupported content]' };
                    });
                }
                return {
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts
                };
            });

            const modelName = this.config.model || this.defaultModel;
            const res = await this.fetchWithTimeout(`${this.baseUrl}/models/${modelName}:generateContent?key=${this.config.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || data.error || res.statusText);

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return {
                success: true,
                text,
                usage: data.usageMetadata
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

    // Normalize old 'agnes' provider key to 'gemini'
    if (actualProvider === 'agnes') {
        actualProvider = 'gemini';
    }

    // 從 secrets 讀取統一格式的 API Key
    const { data: secret } = await supabase.from('secrets').select('value').eq('key', actualProvider).maybeSingle();

    let apiKey = '';
    
    if (secret?.value) {
        apiKey = decrypt(secret.value);
    }

    if (!apiKey) throw new Error(`未配置 ${actualProvider} API 密鑰`);

    let model = modelOverride;
    if (model && actualProvider === 'openrouter' && !model.includes('/')) {
        model = 'google/' + model;
    }
    if (!model) {
        model = await getModel(supabase);
    }
    
    console.log(`[getAIProvider] Using ${actualProvider} with model: ${model}`);  
    const config = { apiKey, model };

    if (actualProvider === 'gemini') {
        return new GeminiProvider(config);
    }
    return new OpenRouterProvider(config);
}
