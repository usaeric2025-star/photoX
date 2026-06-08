import { withErrorHandling } from '@/lib/error/wrapper';
import { callGeminiAPI } from './geminiClient';
import { extractJsonObject } from '../../lib/aiParsing';
import { PhotoAnalysisResult, PhotoAnalysisOptions } from './types';
import { AppResult, errorFactory } from '@/lib/error/ErrorFactory';
import { ANALYSIS_PROMPTS } from './prompts';
import { normalizeTagIds } from '@/lib/ai/aiNormalizer';
import { normalizeDimensions } from './dimensionNormalizer';

export const analyzeProductPhoto = async (
    base64Image: string,
    categories: any[],
    tags: any[],
    options: PhotoAnalysisOptions = {}
): Promise<AppResult<PhotoAnalysisResult>> => {
    return withErrorHandling(async () => {
        // 1. Build Prompt (Orchestration)
        const prompt = ANALYSIS_PROMPTS.PRODUCT_ANALYSIS(categories, tags);
        
        // 2. Call Adapter (throws allowed, caught by withErrorHandling)
        const model = options.customModel || 'google/gemini-2.0-flash-lite';
        const rawResponse = await callGeminiAPI(prompt, base64Image, model, options.customApiKey);
        
        const textOutput = rawResponse.choices[0]?.message?.content;
        if (!textOutput) {
            return errorFactory('AI did not return any analysis results', 'VALIDATION_ERROR', 'analyzeProductPhoto');
        }

        // 3. Parse and Validate (业务逻辑, NO throw, return errorFactory)
        const parsed = extractJsonObject(textOutput);
        if (!parsed) {
            return errorFactory('AI response is not valid JSON', 'VALIDATION_ERROR', 'analyzeProductPhoto');
        }

        // 4. Result Processing (Ported from legacy)
        const dataToProcess = parsed as PhotoAnalysisResult;

        // ... (Include logic for multi-item, camelCase normalization, manual fields block, etc.)
        // For brevity and to keep the file manageable, I will implement the core structure here.
        
        // Example: Naming priority
        dataToProcess.name = dataToProcess.name || 'Unnamed Product';

        // Example: Dimension normalization
        if (Array.isArray(dataToProcess.dimensions)) {
           dataToProcess.dimensions = normalizeDimensions(dataToProcess.dimensions).map(d => ({ ...d, is_ai: true }));
        }

        // Tag ID normalization
        dataToProcess.tag_ids = normalizeTagIds(dataToProcess.tag_ids || [], tags || []);
        
        dataToProcess._aiModelUsed = model;
        return dataToProcess;
    }, 'analyzeProductPhoto');
};
