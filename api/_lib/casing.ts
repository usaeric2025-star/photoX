function snakeToCamel(str: string): string {
    return str.replace(/([-_][a-z])/gi, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
}

export function keysToCamel<T = Record<string, any>>(obj: Record<string, any>): T {
    const n: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
        const camelKey = snakeToCamel(k);
        let val = v;
        if ((camelKey === 'createdAt' || camelKey === 'updatedAt' || camelKey.endsWith('At')) && typeof v === 'string' && v) {
            const parsedDate = new Date(v);
            if (!isNaN(parsedDate.getTime())) {
                val = parsedDate;
            }
        }
        n[camelKey] = val;
    }
    return n as T;
}
