/**
 * AI 響應 JSON 提取工具
 */
export function extractJSON(text: string): any {
  if (!text) return {};
  const trimmed = text.trim();
  
  // 1. Try raw parsing
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // ignore and continue
  }

  // 2. Try cleaning standard markdown code sections
  let cleaned = trimmed.replace(/```(json|yaml)?\n?|```\n?|\n```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // ignore and continue
  }

  // 3. Match from the first brace to the last brace
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // ignore
    }
  }

  throw new Error("Failed to parse AI response as JSON: " + trimmed.substring(0, 300));
}
