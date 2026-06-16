export const translations = {
    zh: {
        error: {
            unauthorized: "未授權訪問",
            internal: "服务器内部错误"
        }
    },
    en: {
        error: {
            unauthorized: "Unauthorized access",
            internal: "Internal server error"
        }
    }
};

export type Language = keyof typeof translations;

export function normalizeI18n(val: unknown): { zh: string; en: string; ms: string } {
    if (!val) return { zh: '', en: '', ms: '' };
    if (typeof val === 'string') return { zh: val, en: val, ms: val };
    const v = val as Record<string, string>;
    return {
        zh: v.zh || v.en || '',
        en: v.en || v.zh || '',
        ms: v.ms || v.en || v.zh || ''
    };
}
