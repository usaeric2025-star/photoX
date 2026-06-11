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

export function normalizeI18n(val: any): { zh: string; en: string; ms: string } {
    if (!val) return { zh: '', en: '', ms: '' };
    if (typeof val === 'string') return { zh: val, en: val, ms: val };
    return {
        zh: val.zh || val.en || '',
        en: val.en || val.zh || '',
        ms: val.ms || val.en || val.zh || ''
    };
}
