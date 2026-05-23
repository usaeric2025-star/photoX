/**
 * AI Parsing Utilities
 * Provides robust JSON extraction from potentially messy AI outputs.
 */

export function extractJsonObject(text: string): any {
  if (!text) return null;
  
  // Strip ```json or ``` blocks
  let cleanText = text.trim();
  cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
  cleanText = cleanText.replace(/```\s*$/i, '');
  
  const startIndex = cleanText.indexOf('{');
  if (startIndex === -1) return null;

  // Balanced brace matching to find the true end of the JSON object
  let braceCount = 0;
  let endIndex = -1;
  let inString = false;
  let escaping = false;

  for (let i = startIndex; i < cleanText.length; i++) {
    const char = cleanText[i];
    if (escaping) {
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex === -1) return null;
  
  const jsonStr = cleanText.substring(startIndex, endIndex + 1);
  
  // Sanitization: Remove comments and fix common AI output quirks
  const sanitized = jsonStr
    .replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '') 
    .replace(/[\u0000-\u0019]+/g, "")
    .replace(/,\s*([\]}])/g, '$1')
    .trim();

  try {
    return JSON.parse(sanitized);
  } catch (e) {
    // Second pass: try to fix common escaping issues
    try {
      const secondPass = sanitized
        .replace(/\r?\n|\r/g, " ") 
        .replace(/\\(?!"|u|n|r|t|b|f)/g, "\\\\");
      return JSON.parse(secondPass);
    } catch (finalErr) {
      console.error("AI Parsing Final Failure:", finalErr, "Content:", sanitized);
      return null;
    }
  }
}
