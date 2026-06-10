import { type } from "arktype";

export type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string | any;
    text?: string;
    usage?: any;
};

export const AIAnalyzeV1ReqSchema = type({
    "photoId?": "string",
    "imageUrl?": "string",
    "image_url?": "string",
    "prompt?": "string",
    "provider?": "'gemini' | 'openrouter'",
    "model?": "string"
});

export const AIRunReqSchema = type({
    task: "string",
    "imageUrl?": "string",
    "prompt?": "string"
});

export const AIAnalyzeBase64ReqSchema = type({
    base64Image: "string",
    "customModel?": "string",
    "promptText?": "string"
});

export const AITranslateReqSchema = type({
    promptText: "string",
    "customModel?": "string"
});

export const AIAnalyzeGroupReqSchema = type({
    photoDetails: "string"
});

export const AIAnalyzePhotoV2ReqSchema = type({
    photoDetail: "string"
});

export const StorageAuditResSchema = type({
    orphans: "string[]",
    redundant: "string[]",
    total_db: "number",
    total_r2: "number"
});

export const ImportOrphansReqSchema = type({
    urls: "string[]",
    "groupId?": "string",
    "userId?": "string"
});

export interface MaintenanceJob {
    id?: string;
    task?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'processing';
    progress: number;
    result?: unknown;
    error?: string;
    created_at?: string;
    message?: string;
    processed?: number;
    total?: number;
}

export const MaintenanceJobSchema = type({
    "id?": "string",
    "task?": "string",
    status: "'pending' | 'running' | 'completed' | 'failed' | 'processing'",
    progress: "number",
    "result?": "unknown",
    "error?": "string",
    "created_at?": "string",
    "message?": "string",
    "processed?": "number",
    "total?": "number"
});
