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
    
    let parsed: any = null;
    let rawResult = '';
    
    if (response?.data && typeof response.data === 'object') {
        parsed = response.data;
        rawResult = JSON.stringify(response.data);
    } else if (response?.content) {
        parsed = extractJsonObject(response.content);
        rawResult = response.content;
    } else if (typeof response === 'object') {
        parsed = response.name ? response : response;
        rawResult = JSON.stringify(response);
    }

    if (!parsed) {
        throw new Error('Could not parse AI response');
    }
    
    if (parsed._fallback) {
        console.warn('[analyzePhoto] Using AI fallback response');
        return ok({
            name: '',
            description: '',
            category_id: null,
            tagNames: [],
            tagIds: [],
            raw_result: rawResult
        } as any);
    }

    let resolvedCategoryId = parsed.category_id || null;
    if (resolvedCategoryId) {
       const exists = categories.find(c => String(c.id) === String(resolvedCategoryId));
       if (!exists) {
           resolvedCategoryId = null; // invalid ID, strip it out
       }
    }

    return ok({
        name: parsed.name || '',
        description: parsed.description || '',
        category_id: resolvedCategoryId,
        tagNames: (parsed.new_tags || parsed.tags || []),
        tagIds: Array.isArray(parsed.tag_ids) ? parsed.tag_ids.map(String) : [],
        raw_result: rawResult
    } as any);
  } catch (err: any) {
    console.error('Analysis failed', err);
    return fail(err.message || 'Analysis failed');
  }
};

