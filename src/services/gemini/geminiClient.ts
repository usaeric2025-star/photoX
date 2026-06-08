import { api } from '@/lib/api';
import { AI_CONFIG } from '../../constants/config';
import { StandardError } from '@/lib/validators/protocol';

export const callGeminiAPI = async (
    prompt: string,
    imageBase64: string,
    model: string,
    apiKey?: string,
    signal?: AbortSignal
): Promise<any> => {
    
    // API Call logic extracted from analyzeProductPhoto
    const timeoutAbort = new AbortController();
    const timeoutId = setTimeout(() => timeoutAbort.abort(), AI_CONFIG.TIMEOUT);

    let combinedSignal;
    if (typeof (AbortSignal as any).any === 'function') {
      combinedSignal = (AbortSignal as any).any([signal, timeoutAbort.signal].filter(Boolean));
    } else {
      combinedSignal = signal || timeoutAbort.signal;
    }

    try {
        const fetchResponse = await api.ai['analyze-base64'].$post({
            json: {
                promptText: prompt,
                base64Image: imageBase64,
                customModel: model.replace('openrouter/', ''),
            }
        }, { signal: combinedSignal }) as any;

        clearTimeout(timeoutId);

        if (!fetchResponse.ok) {
            let errorData: unknown;
            try {
                errorData = await fetchResponse.json();
            } catch (e) {
                errorData = await fetchResponse.text();
            }
            
            const serverMessage = (errorData as any)?.error?.message || (errorData as any)?.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
            const detailedMessage = `HTTP ${fetchResponse.status}: ${serverMessage}`;
            
            throw new StandardError(detailedMessage, { aiDebugHint: `[analyzeProductPhoto/fetch] 底層異常: HTTP ${fetchResponse.status}` });
        }

        return await fetchResponse.json();
    } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        throw e;
    }
};
