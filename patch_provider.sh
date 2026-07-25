cat << 'INNER_EOF' >> api/_lib/ai/providerFactory.ts

export class GeminiProvider extends BaseAIProvider {
    name = "gemini";
    defaultModel = "gemini-2.0-flash";
    baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";

    async chat(messages: { role: string; content: unknown }[]): Promise<AIResponse> {
        try {
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
INNER_EOF
sed -i "s/return new AgnesProvider(config);/return new AgnesProvider(config);\n    }\n    if (actualProvider === 'gemini') {\n        return new GeminiProvider(config);/" api/_lib/ai/providerFactory.ts
sed -i "s/return targetProvider === 'openrouter' ? 'google\/gemini-2.5-flash-lite' : 'gemini-2.0-flash-exp';/return targetProvider === 'openrouter' ? 'google\/gemini-2.5-flash-lite' : targetProvider === 'agnes' ? 'gemini-2.0-flash-exp' : 'gemini-2.0-flash';/" api/_lib/ai/providerFactory.ts
