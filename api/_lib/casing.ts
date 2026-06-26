export function snakeToCamel(str: string): string {
    return str.replace(/([-_][a-z])/gi, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
}

export function keysToCamel<T = Record<string, any>>(obj: Record<string, any>): T {
    const n: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
        n[snakeToCamel(k)] = v;
    }
    return n as T;
}
