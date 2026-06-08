export interface PhotoAnalysisResult {
    name: string;
    description: string;
    category_id: string | null;
    tag_ids: string[];
    new_tags: string[];
    manual_code: string | null;
    dimensions: any[];
    _aiModelUsed?: string;
    [key: string]: any;
}

export interface PhotoAnalysisOptions {
    customApiKey?: string;
    provider?: string;
    customModel?: string;
    targetCategoryId?: string | null;
    originalName?: string | null;
}
