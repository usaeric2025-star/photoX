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

function getStringValue(val: unknown): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        const innerCandidate = obj.zh || obj.en || obj.ms;
        if (innerCandidate) {
            return getStringValue(innerCandidate);
        }
        const firstStr = Object.values(obj).find(v => typeof v === 'string');
        if (typeof firstStr === 'string') return firstStr;
        return '';
    }
    return String(val);
}

export function normalizeI18n(val: unknown): { zh: string; en: string; ms: string } {
    if (!val) return { zh: '', en: '', ms: '' };
    if (typeof val === 'string') return { zh: val, en: val, ms: val };
    
    const v = val as Record<string, unknown>;
    return {
        zh: getStringValue(v.zh || v.en || ''),
        en: getStringValue(v.en || v.zh || ''),
        ms: getStringValue(v.ms || v.en || v.zh || '')
    };
}
