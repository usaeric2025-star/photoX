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

export function normalizeI18n(val: any): { en: string; zh: string } {
    if (!val) return { en: '', zh: '' };
    if (typeof val === 'string') return { en: val, zh: val };
    return {
        en: val.en || val.zh || '',
        zh: val.zh || val.en || ''
    };
}
