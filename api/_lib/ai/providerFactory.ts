import { decrypt } from "../encryption.js";
import { getServerEnv } from "../../../shared/envSchema.js";
import { DEFAULT_AI_MODELS } from "../../../shared/aiModels.js";
import { logger } from "../logger.js";
import { db, secrets as secretsTable, settings as settingsTable } from '../../_lib/db/index.js';
import { eq } from "drizzle-orm";

const getModel = async (customModel?: string, providerName?: string): Promise<string> => {
    if (customModel) return customModel;

    let targetProvider = (providerName as keyof typeof DEFAULT_AI_MODELS) || 'openrouter';

    try {
        // First check secrets table for provider specific model
        const secretData = await db.query.secrets.findFirst({
            where: eq(secretsTable.key, `${targetProvider}_model`)
        });
        if (secretData?.value) return secretData.value as string;
        
        /* Fallback removed: all AI config should be in secrets table */
    } catch (e) {
        logger.warn("[getModel] could not fetch custom model:", e);
    }

    try {
        const env = getServerEnv(process.env as Record<string, string | undefined>);
        if ((env as Record<string, string | undefined>).DEFAULT_AI_MODEL) return (env as Record<string, string | undefined>).DEFAULT_AI_MODEL!;
    } catch {}

    return DEFAULT_AI_MODELS[targetProvider] || DEFAULT_AI_MODELS.openrouter;
};

export interface AIResponse {
    success: boolean;
    text?: string;
    error?: string;
    usage?: Record<string, unknown>;
}

export interface AIProviderConfig {
    apiKey: string;
    model?: string;
}

export interface ChatOptions {
    max_tokens?: number;
}

export abstract class BaseAIProvider {
    abstract name: string;
    abstract defaultModel: string;
    abstract baseUrl: string;

    constructor(protected config: AIProviderConfig) {}

    public getConfig(): AIProviderConfig {
        return this.config;
    }

    protected async fetchWithTimeout(url: string, options: RequestInit, timeout = 60000) {
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

    abstract chat(messages: { role: string; content: unknown }[], options?: ChatOptions): Promise<AIResponse>;
}

export class OpenRouterProvider extends BaseAIProvider {
    name = "openrouter";
    defaultModel = DEFAULT_AI_MODELS.openrouter;
    baseUrl = "https://openrouter.ai/api/v1";

    async chat(messages: { role: string; content: unknown }[], options?: ChatOptions): Promise<AIResponse> {
        let maxTokens = options?.max_tokens ?? 800;
        
        const makeRequest = async (tokensToUse: number) => {
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
                    messages,
                    max_tokens: tokensToUse,
                    max_completion_tokens: tokensToUse
                })
            });

            const data = await res.json() as { choices?: { message: { content: string } }[]; error?: { message: string } | string; usage?: Record<string, unknown> };
            return { res, data };
        };

        try {
            let { res, data } = await makeRequest(maxTokens);

            if (!res.ok) {
                const errorStr = (typeof data.error === 'string' ? data.error : data.error?.message) || res.statusText;
                
                // If OpenRouter rejects due to high max_tokens relative to credit balance, retry with lower max_tokens
                if (errorStr.includes('fewer max_tokens') || errorStr.includes('more credits') || errorStr.includes('can only afford')) {
                    const affordMatch = errorStr.match(/can only afford (\d+)/i);
                    let affordable = affordMatch ? parseInt(affordMatch[1], 10) : Math.floor(maxTokens / 2);
                    if (affordable > 50) {
                        affordable = Math.max(100, affordable - 10);
                        if (affordable < maxTokens) {
                            const retryResult = await makeRequest(affordable);
                            if (retryResult.res.ok) {
                                res = retryResult.res;
                                data = retryResult.data;
                            }
                        }
                    }
                }

                if (!res.ok) {
                    throw new Error((typeof data.error === 'string' ? data.error : data.error?.message) || res.statusText);
                }
            }

            return {
                success: true,
                text: data.choices?.[0]?.message?.content,
                usage: data.usage
            };
        } catch (e: unknown) {
            return { success: false, error: (e as Error).message };
        }
    }
}

export class AgnesProvider extends BaseAIProvider {
    name = "agnes";
    defaultModel = DEFAULT_AI_MODELS.agnes;
    baseUrl = "https://apihub.agnes-ai.com/v1";

    async chat(messages: { role: string; content: unknown }[], options?: ChatOptions): Promise<AIResponse> {
        try {
            let modelToUse = this.config.model || this.defaultModel;
            if (modelToUse.startsWith('google/')) {
                modelToUse = modelToUse.replace(/^google\//, '');
            }
            const maxTokens = options?.max_tokens ?? 1200;
            // Agnes API uses OpenAI format, not Gemini's native format
            const res = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: modelToUse,
                    messages,
                    max_tokens: maxTokens
                })
            });

            const data = await res.json() as { choices?: { message: { content: string } }[]; error?: { message: string } | string; usage?: Record<string, unknown> };
            if (!res.ok) throw new Error((typeof data.error === 'string' ? data.error : data.error?.message) || res.statusText);

            return {
                success: true,
                text: data.choices?.[0]?.message?.content,
                usage: data.usage
            };
        } catch (e: unknown) {
            return { success: false, error: (e as Error).message };
        }
    }
}

export async function getAIProvider(providerName?: string, modelOverride?: string) {
    // 從 secrets 讀取首选供應商
    const primary = await db.query.secrets.findFirst({
        where: eq(secretsTable.key, 'PRIMARY_AI_PROVIDER')
    });
    let requestedProvider = providerName || primary?.value as string || 'openrouter';

    const getKeyForProvider = async (p: string): Promise<string> => {
        const secret = await db.query.secrets.findFirst({
            where: eq(secretsTable.key, p)
        });
        if (secret?.value) {
            try {
                const dec = decrypt(secret.value as string);
                if (dec && dec.trim()) return dec.trim();
            } catch {
                // ignore decrypt error
            }
        }
        if ((p === 'gemini' || p === 'agnes') && process.env.GEMINI_API_KEY) {
            return process.env.GEMINI_API_KEY;
        }
        if (p === 'openrouter' && process.env.OPENROUTER_API_KEY) {
            return process.env.OPENROUTER_API_KEY;
        }
        return '';
    };

    let actualProvider = requestedProvider;
    let apiKey = await getKeyForProvider(actualProvider);

    // 如果首选 Provider 未配置 Key，自动切到有可用 Key 的 Provider
    if (!apiKey) {
        const candidates = ['openrouter', 'agnes', 'gemini'].filter(p => p !== actualProvider);
        for (const candidate of candidates) {
            const candidateKey = await getKeyForProvider(candidate);
            if (candidateKey) {
                actualProvider = candidate;
                apiKey = candidateKey;
                logger.info(`[getAIProvider] ${requestedProvider} 未配置 Key，已自动回退到 ${actualProvider}`);
                break;
            }
        }
    }

    if (!apiKey) throw new Error(`未配置 ${requestedProvider} API 密鑰`);

    let model = modelOverride;
    if (!model) {
        model = await getModel(undefined, actualProvider);
    }

    if (actualProvider === 'openrouter') {
        if (model && !model.includes('/')) {
            model = 'google/' + model;
        }
    } else if (actualProvider === 'gemini' || actualProvider === 'agnes') {
        if (model && model.startsWith('google/')) {
            model = model.replace(/^google\//, '');
        }
    }
    
    logger.info(`[getAIProvider] Using ${actualProvider} with model: ${model}`);  
    const config = { apiKey, model };

    if (actualProvider === 'agnes') {
        return new AgnesProvider(config);
    }
    if (actualProvider === 'gemini') {
        return new GeminiProvider(config);
    }
    return new OpenRouterProvider(config);
}

export class GeminiProvider extends BaseAIProvider {
    name = "gemini";
    defaultModel = DEFAULT_AI_MODELS.gemini;
    baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";

    async chat(messages: { role: string; content: unknown }[], options?: ChatOptions): Promise<AIResponse> {
        try {
            let modelToUse = this.config.model || this.defaultModel;
            if (modelToUse.startsWith('google/')) {
                modelToUse = modelToUse.replace(/^google\//, '');
            }
            const maxTokens = options?.max_tokens ?? 1200;

            const res = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: modelToUse,
                    messages,
                    max_tokens: maxTokens
                })
            });

            const data = await res.json() as any;
            if (!res.ok) throw new Error((typeof data.error === 'string' ? data.error : data.error?.message) || res.statusText);

            return {
                success: true,
                text: data.choices?.[0]?.message?.content,
                usage: data.usage
            };
        } catch (e: unknown) {
            return { success: false, error: (e as Error).message };
        }
    }
}
