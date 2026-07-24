import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { api } from '#lib/api.js';
import type { TranslationResult } from './types.js';

export const translateFields = async (
  name: string,
  description: string
): Promise<TranslationResult> => {
  const [nameData, descData] = await Promise.all([
    ErrorFactory.unwrap<any>(
      api.ai['translate'].$post({ json: { promptText: `Translate this to EN and MS, return JSON format { "en": "...", "ms": "..." }. Input: "${name}"` } }),
      'Name translation failed'
    ),
    ErrorFactory.unwrap<any>(
      api.ai['translate'].$post({ json: { promptText: `Translate this to EN and MS, return JSON format { "en": "...", "ms": "..." }. Input: "${description}"` } }),
      'Description translation failed'
    )
  ]);
    
  const translateRes = (text: string, data: any) => {
      const content = (data && typeof data === 'object' && 'content' in data)
          ? data.content
          : data;
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
    name: name,
    description: { zh: description, en: dt.en, ms: dt.ms }
  };
};
