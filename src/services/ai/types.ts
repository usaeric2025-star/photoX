export interface AIAnalysisResult {
  name: string; // Chinese Name
  description: string; // Chinese Description
  category_id: string | null;
  tagNames: string[];
  tagIds?: string[];
}

export interface TranslationResult {
  name: { zh: string; en: string; ms: string };
  description: { zh: string; en: string; ms: string };
}

export interface ProcessedPhotoData {
  name: { zh: string; en: string; ms: string };
  description: { zh: string; en: string; ms: string };
  category_id: string | null;
  tagNames: string[];
  tagIds?: string[];
}
