import { callGeminiAPI } from '../gemini/geminiClient';
import { ANALYSIS_PROMPTS } from '../gemini/prompts';
import { extractJsonObject } from '@/lib/aiParsing';
import { ok, fail } from '@/lib/utils/result';
import { AppResult } from '@/types/api';
import type { AIAnalysisResult } from './types';

export const analyzePhoto = async (
  imageUrl: string, 
  categories: any[], 
  tags: any[], 
  model: string, 
  apiKey: string
): Promise<AppResult<AIAnalysisResult>> => {
  try {
    const prompt = ANALYSIS_PROMPTS.PRODUCT_ANALYSIS(categories, tags);
    
    // Assuming imageUrl is passed as base64 as per previous implementation expectation
    const response = await callGeminiAPI(prompt, imageUrl, model, apiKey);
    
    const parsed = extractJsonObject(response.content);
    return ok({
        name: parsed.name,
        description: parsed.description,
        category_id: parsed.category_id,
        tagNames: parsed.new_tags || [],
        raw_result: response.content
    });
  } catch (err: any) {
    console.error('Analysis failed', err);
    return fail(err.message || 'Analysis failed');
  }
};

