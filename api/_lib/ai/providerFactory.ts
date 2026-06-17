import { decrypt } from "../encryption.js";
import { getServerEnv } from "../../_shared/envSchema.js";
import { logger } from "../logger.js";
import { db, secrets as secretsTable, settings as settingsTable } from '../../_lib/db/index.js';
import { eq } from "drizzle-orm";

export const getModel = async (customModel?: string, providerName?: string): Promise<string> => {
    if (customModel) return customModel;

    let targetProvider = providerName || 'openrouter';

    try {
        // First check secrets table for provider specific model
        const secretData = await db.query.secrets.findFirst({
            where: eq(secretsTable.key, `${targetProvider}_model`)
        });
        if (secretData?.value) return secretData.value as string;
        
        // Fallback to legacy custom_model setting
        const settingsRes = await db.query.settings.findFirst({
            where: eq(settingsTable.id, 1)
        });
        if (settingsRes?.customModel) return settingsRes.customModel as string;
    } catch (e) {
        logger.warn("[getModel] could not fetch custom model:", e);
    }

    try {
        const env = getServerEnv(process.env as Record<string, string | undefined>);
        if ((env as Record<string, string | undefined>).DEFAULT_AI_MODEL) return (env as Record<string, string | undefined>).DEFAULT_AI_MODEL!;
    } catch {}

    return targetProvider === 'openrouter' ? 'google/gemini-2.5-flash-lite' : 'gemini-2.0-flash-exp';
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

export abstract class BaseAIProvider {
    abstract name: string;
    abstract defaultModel: string;
    abstract baseUrl: string;

    constructor(protected config: AIProviderConfig) {}

    public getConfig(): AIProviderConfig {
        return this.config;
    }

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

    abstract chat(messages: { role: string; content: unknown }[]): Promise<AIResponse>;
}

export class OpenRouterProvider extends BaseAIProvider {
    name = "openrouter";
    defaultModel = "google/gemini-2.5-flash-lite";
    baseUrl = "https://openrouter.ai/api/v1";

    async chat(messages: { role: string; content: unknown }[]): Promise<AIResponse> {
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

export class AgnesProvider extends BaseAIProvider {
    name = "agnes";
    defaultModel = "gemini-2.0-flash-exp";
    baseUrl = "https://apihub.agnes-ai.com/v1";

    async chat(messages: { role: string; content: unknown }[]): Promise<AIResponse> {
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
    let actualProvider = providerName || primary?.value as string || 'openrouter';

    // 從 secrets 讀取統一格式的 API Key
    let secret = await db.query.secrets.findFirst({
        where: eq(secretsTable.key, actualProvider)
    });

    let apiKey = '';
    
    if (secret?.value) {
        apiKey = decrypt(secret.value as string);
    }

    // Fallback logic for legacy settings table
    if (!apiKey) {
        try {
            const settings = await db.query.settings.findFirst();
            if (settings?.geminiApiKey) {
               // Basic heuristic to decide if the legacy key belongs to this provider
               const key = settings.geminiApiKey as string;
               if (actualProvider === 'openrouter' && key.startsWith('sk-or-')) {
                   apiKey = decrypt(key);
               } else if (actualProvider === 'agnes' && !key.startsWith('sk-or-')) {
                   apiKey = decrypt(key);
               }
            }
        } catch (e) {
            logger.warn("Legacy settings lookup failed:", e);
        }
    }

    if (!apiKey) throw new Error(`未配置 ${actualProvider} API 密鑰`);

    let model = modelOverride;
    if (model && actualProvider === 'openrouter' && !model.includes('/')) {
        model = 'google/' + model;
    }
    if (!model) {
        model = await getModel(undefined, actualProvider);
    }
    
    logger.info(`[getAIProvider] Using ${actualProvider} with model: ${model}`);  
    const config = { apiKey, model };

    if (actualProvider === 'agnes') {
        return new AgnesProvider(config);
    }
    return new OpenRouterProvider(config);
}
