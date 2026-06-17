import { logger } from '@/lib/logger';
import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import type { TranslationResult } from './types';

export const translateFields = async (
  name: string,
  description: string
): Promise<TranslationResult> => {
  try {
    const p1 = api.ai['translate'].$post({ json: { promptText: `Translate this to EN and MS, return JSON format { "en": "...", "ms": "..." }. Input: "${name}"` } });
    const p2 = api.ai['translate'].$post({ json: { promptText: `Translate this to EN and MS, return JSON format { "en": "...", "ms": "..." }. Input: "${description}"` } });
    
    const [nameRes, descRes] = await Promise.all([p1, p2]);

    interface TranslationPayload {
      data?: {
        content?: string | { en?: string; ms?: string };
      } | { en?: string; ms?: string } | string;
    }

    const nameData = (await nameRes.json()) as TranslationPayload;
    const descData = (await descRes.json()) as TranslationPayload;

    const translateRes = (text: string, data: TranslationPayload) => {
        const content = (data?.data && typeof data.data === 'object' && 'content' in data.data)
            ? data.data.content
            : data?.data;
        const fallback = "{}";
        const contentStrOrObj = content || fallback;
        let parsed: { en?: string; ms?: string } = { en: text, ms: text };
        try {
            if (typeof contentStrOrObj === 'string') {
              const cleaned = contentStrOrObj.replace(/```json\s*/i, '').replace(/```.*/i, '').trim();
              parsed = JSON.parse(cleaned);
            } else if (contentStrOrObj && typeof contentStrOrObj === 'object') {
              parsed = contentStrOrObj as { en?: string; ms?: string };
            }
        } catch(e) {}
        return {
            en: parsed.en || text,
            ms: parsed.ms || text
        };
    }

    const nt = translateRes(name, nameData);
    const dt = translateRes(description, descData);
    
    return {
      name: { zh: name, en: nt.en, ms: nt.ms },
      description: { zh: description, en: dt.en, ms: dt.ms }
    };
  } catch (err) {
    logger.error('Translation failed', err);
    throw ErrorFactory.fatal((err as Error).message || 'Translation failed', { context: 'translateFields' });
  }
};
