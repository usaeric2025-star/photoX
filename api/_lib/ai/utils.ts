export function extractJSON<T = unknown>(str: string): T {
    const firstBracket = str.indexOf('{');
    const lastBracket = str.lastIndexOf('}');
    
    if (firstBracket === -1 || lastBracket === -1) {
        throw new Error('No JSON object found in response');
    }
    
    const jsonStr = str.substring(firstBracket, lastBracket + 1);
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e: unknown) {
        // Try simple cleanup if parse fails
        try {
            const cleaned = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
            return JSON.parse(cleaned) as T;
        } catch {
            const errMsg = e instanceof Error ? e.message : String(e);
            throw new Error('Invalid JSON format even after cleanup: ' + errMsg);
        }
    }
}
