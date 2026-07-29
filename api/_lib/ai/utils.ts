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
    
    // Balanced bracket matching while ignoring characters inside string literals
    let lastBracket = -1;
    let bracketCount = 0;
    const opening = isArray ? '[' : '{';
    const closing = isArray ? ']' : '}';

    let inString = false;
    let isEscaped = false;

    for (let i = firstBracket; i < str.length; i++) {
        const char = str[i];

        if (isEscaped) {
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            isEscaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === opening) {
                bracketCount++;
            } else if (char === closing) {
                bracketCount--;
                if (bracketCount === 0) {
                    lastBracket = i;
                    break;
                }
            }
        }
    }

    // Fallback to lastIndexOf if string literal balance matching didn't reach 0
    if (lastBracket === -1) {
        lastBracket = str.lastIndexOf(closing);
    }
    
    // Attempt repair if missing closing bracket
    if (lastBracket === -1 || lastBracket < firstBracket) {
        let repairedStr = str.substring(firstBracket).trim();
        // Remove trailing comma if any
        if (repairedStr.endsWith(',')) {
            repairedStr = repairedStr.slice(0, -1);
        }
        if (inString) {
            repairedStr += '"';
        }
        while (bracketCount > 0) {
            repairedStr += closing;
            bracketCount--;
        }
        try {
            return JSON.parse(repairedStr) as T;
        } catch {
            throw new Error('No closing bracket found in response');
        }
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
