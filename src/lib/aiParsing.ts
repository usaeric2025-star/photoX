import { jsonrepair } from 'jsonrepair';

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

  // Try direct parsing first in case the JSON is perfectly valid and fast
  try {
    const directText = cleanText.substring(startIndex);
    // Find absolute last brace just in case of trailing text
    const lastBraceIndex = directText.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      return JSON.parse(directText.substring(0, lastBraceIndex + 1));
    }
  } catch (e) {
    // ignore
  }

  // Use jsonrepair on the clean text substring starting from '{'
  try {
    const rawJson = cleanText.substring(startIndex);
    const repaired = jsonrepair(rawJson);
    return JSON.parse(repaired);
  } catch (repairErr) {
    console.warn("jsonRepair direct pass failed, trying substring search:", repairErr);
  }

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

  // If balanced brace matching failed, fall back to the absolute last '}'
  if (endIndex === -1) {
    endIndex = cleanText.lastIndexOf('}');
  }
  
  if (endIndex === -1 || endIndex <= startIndex) {
    try {
      const repaired = jsonrepair(cleanText.substring(startIndex));
      return JSON.parse(repaired);
    } catch (e) {
      return null;
    }
  }
  
  const jsonStr = cleanText.substring(startIndex, endIndex + 1);
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      const repaired = jsonrepair(jsonStr);
      return JSON.parse(repaired);
    } catch (finalErr) {
      console.error("AI Parsing Final Failure:", finalErr, "Content:", jsonStr);
      return null;
    }
  }
}
