export function extractJSON<T = unknown>(str: string): T {
    let firstBracket = str.indexOf('{');
    
    // Also handle array responses if any
    const firstSquare = str.indexOf('[');
    let isArray = false;
    
    if (firstSquare !== -1 && (firstBracket === -1 || firstSquare < firstBracket)) {
        firstBracket = firstSquare;
        isArray = true;
    }

    if (firstBracket === -1) {
        throw new Error('No JSON found in response');
    }
    
    // Balanced bracket matching to find the end of the first valid JSON block
    let lastBracket = -1;
    let bracketCount = 0;
    const opening = isArray ? '[' : '{';
    const closing = isArray ? ']' : '}';

    for (let i = firstBracket; i < str.length; i++) {
        if (str[i] === opening) bracketCount++;
        else if (str[i] === closing) {
            bracketCount--;
            if (bracketCount === 0) {
                lastBracket = i;
                break;
            }
        }
    }

    // Fallback to lastIndexOf if balanced matching didn't find a complete block
    // (though balanced matching is usually what we want for "extra characters after JSON" errors)
    if (lastBracket === -1) {
        lastBracket = str.lastIndexOf(closing);
    }
    
    if (lastBracket === -1 || lastBracket < firstBracket) {
        throw new Error('No closing bracket found in response');
    }
    
    const jsonStr = str.substring(firstBracket, lastBracket + 1);
    
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e: unknown) {
        // More aggressive cleanup for control characters and other common issues
        const cleaned = jsonStr
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
            .replace(/\\n/g, "\\n") // Ensure newlines are escaped correctly
            .replace(/\\'/g, "'"); // Fix escaped single quotes which are invalid in JSON
            
        try {
            return JSON.parse(cleaned) as T;
        } catch (innerError: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            throw new Error('Invalid JSON format even after cleanup: ' + errMsg);
        }
    }
}
