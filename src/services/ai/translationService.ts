import { api } from '@/lib/api';
import { ok, fail } from '@/lib/utils/result';
import { AppResult } from '@/types/api';
import type { TranslationResult } from './types';

export const translateFields = async (
  name: string,
  description: string
): Promise<AppResult<TranslationResult>> => {
  try {
    const p1 = api.ai['translate'].$post({ json: { promptText: `Translate this to EN and MS, return JSON format { "en": "...", "ms": "..." }. Input: "${name}"` } });
    const p2 = api.ai['translate'].$post({ json: { promptText: `Translate this to EN and MS, return JSON format { "en": "...", "ms": "..." }. Input: "${description}"` } });
    
    const [nameRes, descRes] = await Promise.all([p1, p2]);

    const nameData = await nameRes.json() as any;
    const descData = await descRes.json() as any;

    const translateRes = (text: string, data: any) => {
        let content = data?.data?.content || data?.data || "{}";
        let parsed = { en: text, ms: text };
        try {
            if (typeof content === 'string') {
              const cleaned = content.replace(/```json\s*/i, '').replace(/```.*/i, '').trim();
              parsed = JSON.parse(cleaned);
            } else {
              parsed = content;
            }
        } catch(e) {}
        return parsed;
    }

    const nt = translateRes(name, nameData);
    const dt = translateRes(description, descData);
    
    return ok({
      name: { zh: name, en: nt.en, ms: nt.ms },
      description: { zh: description, en: dt.en, ms: dt.ms }
    });
  } catch (err: any) {
    console.error('Translation failed', err);
    return fail(err.message || 'Translation failed');
  }
};
