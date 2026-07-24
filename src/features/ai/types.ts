/**
 * ============================================================================
 * PHOTOX AI SYSTEM CONTRACTS & ADAPTERS (AI 數據契約與適配器系統)
 * ============================================================================
 * 
 * 📌 [設計哲學]
 * - 業界標準做法 (Industry Best Practice): 將 AI 回傳的「非結構化 / 雜亂數據」
 *   與 UI 的「強型態表單狀態」及「儲存 Schema」徹底解耦。
 * - 透過強型態數據契約 (Data Contracts) 與適配器模式 (Adapter Pattern)，
 *   未來不論更換或增加 AI 供應商 (如 Gemini, Claude, GPT, Local LLM)
 *   或新增 AI 分析屬性（如估價、材質、風格），只需新增對應的 Adapter 並註冊即可。
 * - 遵守「就近整合」與「反過度拆分」規範，本檔案收納了所有 AI 核心契約與預設適配器。
 */

import { Dimension } from '#src/types/index.js';
import { normalizeUnit } from '#src/utils/photo.js';

/**
 * 1. 統一的 AI 照片識別輸出契約 (Normalized AI Analysis Contract)
 * 這是全系統通用的最終強型態 AI 回傳結構。
 */
interface NormalizedPhotoAIOutput {
  /** 商品/家具名稱 (單一主文字，通常為中文) */
  name: string;
  
  /** 多語系描述 */
  description: {
    zh: string;
    en?: string;
    ms?: string;
  };
  
  /** 預測對應的系統分類 ID */
  categoryId: string | null;
  
  /** 預測對應的系統分組 ID (Group ID) */
  groupId: string | null;
  
  /** AI 推薦的標籤名稱列表 */
  tagNames: string[];
  
  /** 預測或測量的尺寸列表 */
  dimensions: Dimension[];
  
  /** 原始 AI 字串或完整 JSON 備份，供二次提取或除錯使用 */
  rawResult: string;
}

/**
 * 2. 業界標準：AI 代理適配器介面 (AI Agent Adapter Interface)
 */
export interface IPhotoAIAgentAdapter<TRawResponse = Record<string, unknown>> {
  /**
   * 唯一職責：將任意 AI 服務回傳的原始、可能混亂的資料，
   * 提煉、補齊、並轉換為系統統一要求的強型態輸出契約。
   */
  normalize(raw: TRawResponse, rawText?: string): NormalizedPhotoAIOutput;
}

/**
 * Helper: 安全的字串修剪與備用值處理
 */
const safeTrim = (val: unknown): string => {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  return String(val).trim();
};

/**
 * 3. 預設 Gemini 服務適配器 (Default Gemini Photo AI Adapter)
 */
class GeminiPhotoAIAdapter implements IPhotoAIAgentAdapter {
  normalize(raw: Record<string, unknown>, rawText?: string): NormalizedPhotoAIOutput {
    if (!raw) {
      throw new Error('Adapter Error: Input raw data is empty');
    }

    // 1. 提煉名稱 (Name)
    let finalName = '';
    if (raw.name) {
      if (typeof raw.name === 'object' && raw.name !== null) {
        const nameObj = raw.name as Record<string, unknown>;
        finalName = safeTrim(nameObj.zh || nameObj.en || nameObj.ms || '');
      } else {
        finalName = safeTrim(raw.name);
      }
    }

    // 2. 提煉多語系描述 (Description)
    const finalDesc: { zh: string; en?: string; ms?: string } = { zh: '' };
    if (raw.description) {
      if (typeof raw.description === 'object' && raw.description !== null) {
        const descObj = raw.description as Record<string, unknown>;
        finalDesc.zh = safeTrim(descObj.zh || '');
        if (descObj.en) finalDesc.en = safeTrim(descObj.en);
        if (descObj.ms) finalDesc.ms = safeTrim(descObj.ms);
      } else {
        finalDesc.zh = safeTrim(raw.description);
      }
    }

    // 3. 提煉分類與分組 ID
    const rawCat = raw.category_id ?? raw.categoryId ?? raw.category_name ?? raw.categoryName ?? raw.category;
    let categoryId: string | null = null;
    if (rawCat !== undefined && rawCat !== null && rawCat !== '') {
      if (typeof rawCat === 'object' && rawCat !== null) {
        const catObj = rawCat as Record<string, unknown>;
        categoryId = String(catObj.id || catObj.code || catObj.name || catObj.zh || catObj.en || '').trim();
      } else {
        categoryId = String(rawCat).trim();
      }
    }
    const groupId = raw.group_id ? String(raw.group_id) : null;

    // 4. 提煉與淨化標籤 (Tag Names)
    const rawTags = raw.tagNames || raw.tag_names || raw.new_tags || raw.tags || raw.keywords || raw.labels || [];
    let tagNames: string[] = [];
    if (Array.isArray(rawTags)) {
      tagNames = (rawTags as unknown[])
        .map((t) => {
          if (!t) return '';
          if (typeof t === 'object' && t !== null) {
            const tagObj = t as Record<string, unknown>;
            return safeTrim(tagObj.name || tagObj.zh || tagObj.en || tagObj.label || '');
          }
          return safeTrim(t);
        })
        .filter(Boolean);
    }

    // 5. 提煉尺寸 (Dimensions)
    const dimensions: Dimension[] = [];
    if (Array.isArray(raw.dimensions)) {
      (raw.dimensions as unknown[]).forEach((d) => {
        if (d && typeof d === 'object') {
          const dimObj = d as Record<string, unknown>;
          const label = dimObj.label || dimObj.part || 'W_D_H';
          dimensions.push({
            label: safeTrim(label),
            part: safeTrim(dimObj.part || label),
            width: typeof dimObj.width === 'number' ? dimObj.width : parseFloat(String(dimObj.width)) || 0,
            length: typeof dimObj.length === 'number' ? dimObj.length : (typeof dimObj.depth === 'number' ? dimObj.depth : parseFloat(String(dimObj.length || dimObj.depth)) || 0),
            height: typeof dimObj.height === 'number' ? dimObj.height : parseFloat(String(dimObj.height)) || 0,
            unit: normalizeUnit(String(dimObj.unit || 'cm'), dimObj),
            isAi: true,
          });
        }
      });
    }

    return {
      name: finalName,
      description: finalDesc,
      categoryId,
      groupId,
      tagNames,
      dimensions,
      rawResult: rawText || JSON.stringify(raw),
    };
  }
}

/**
 * 4. 業界標準：AI 適配器註冊中心 (AI Adapter Registry)
 * 供未來若需要增加其他的 AI 模組、提供者（如 Claude, OpenAI, LocalLLM）時動態註冊。
 */
export class PhotoAIAdapterRegistry {
  private static adapters = new Map<string, IPhotoAIAgentAdapter>();

  static {
    // 預先註冊預設的 Gemini 適配器
    this.register('gemini', new GeminiPhotoAIAdapter());
  }

  /**
   * 註冊一個新的 AI 適配器
   */
  static register(provider: string, adapter: IPhotoAIAgentAdapter) {
    this.adapters.set(provider.toLowerCase(), adapter);
  }

  /**
   * 根據 Provider 名稱取得對應適配器，若不存在則回傳預設的 Gemini 適配器
   */
  static getAdapter(provider: string = 'gemini'): IPhotoAIAgentAdapter {
    const key = provider.toLowerCase();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      // 找不到時，優雅降級回傳預設的 Gemini 適配器
      return this.adapters.get('gemini')!;
    }
    return adapter;
  }
}

/**
 * 5. 既有系統相容型態 (Legacy Compat Types)
 */
interface AIAnalysisResult {
  name: string;
  description: string;
  category_id: string | null;
  tagNames: string[];
  tagIds?: string[];
}

export interface TranslationResult {
  name: string;
  description: { zh: string; en: string; ms: string };
}

interface ProcessedPhotoData {
  name: string;
  description: { zh: string; en: string; ms: string };
  category_id: string | null;
  tagNames: string[];
  tagIds?: string[];
}
