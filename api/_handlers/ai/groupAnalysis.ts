import * as v from 'valibot';
import { db, furnitureItems } from '../../_lib/db/index.js';
import { inArray } from 'drizzle-orm';
import { getAIProvider } from '../../_lib/ai/providerFactory.js';
import { executeAITask } from '../../_lib/ai/executor.js';
import { logger } from '../../_lib/logger.js';

// 1. 輸出 Schema（與提示詞嚴格對應）
export const GroupAnalysisSchema = v.object({
  groups: v.array(v.object({
    name: v.string(), // English
    description: v.object({
      zh: v.string(),
      en: v.string(),
      ms: v.string()
    }),
    photoIds: v.array(v.string())
  }))
});

// 2. 簡化提示詞：基於名稱與編號進行精準分組合組
const buildPrompt = (photoCount: number, photoList: string) => `你是一個專業的家具與產品分組合組專家。

## 任務
請根據以下 ${photoCount} 張照片的【產品名稱】、【商品編號/型號】及相關文字信息，將屬於同一產品系列、同套家具或相近款式名稱的照片精準分組。

## ⚠️ 硬性要求（違反將導致處理失敗）
1. **名稱規範**：group 的 name 必須為簡短英文系列名稱或主題名稱（例如 "Nordic Dining Series", "Modern Living Set"）。
2. **描述規範**：description 必須包含 中文 (zh)、英文 (en) 和 馬來文 (ms)。
3. 輸出純 JSON，不要包含 Markdown 代碼塊或任何其他文字。
4. 格式嚴格匹配以下 Schema：
   { 
     "groups": [
       { 
         "name": "English Group Name", 
         "description": { "zh": "中文描述", "en": "English Description", "ms": "Penerangan Melayu" }, 
         "photoIds": ["UUID"] 
       }
     ] 
   }
5. 完整性校驗：每張照片的 ID 回傳總數必須等於輸入的 ${photoCount} 個，且每個 ID 必須屬於輸入列表。
6. 禁止使用「其他」「雜項」「未分類」等佔位詞。
7. 合組數量建議 1-${Math.max(1, Math.min(8, photoCount))} 個，視名稱重複度与系列相似度而定。

## 判斷依據（重點根據名稱）
- **名稱/系列相同或相近**（如："北歐橡木餐桌" 與 "北歐橡木餐椅" 歸為同一組）
- **編號/型號前綴一致**（如："NOK-01" 與 "NOK-02" 歸為同一組）
- 若名稱完全不同或無任何共通系列特徵，可單獨成組或歸入不同系列。

## 待分組產品列表
${photoList}

請輸出 JSON：`;

export async function processGroupAnalysis(photoIds: string[]) {
  if (photoIds.length === 0) throw new Error('Input photo IDs list is empty');
  
  const photos = await db.select({
    id: furnitureItems.id,
    name: furnitureItems.name,
    description: furnitureItems.description,
    itemCode: furnitureItems.itemCode,
    modelNumber: furnitureItems.modelNumber,
  })
  .from(furnitureItems)
  .where(inArray(furnitureItems.id, photoIds));
    
  if (!photos || photos.length === 0) {
    throw new Error('未找到請求的照片詳情，無法分析');
  }

  const photoListText = photos.map((p) => {
    const nameObj = typeof p.name === 'object' ? (p.name as Record<string, string> | null) : null;
    const name = nameObj?.zh || (typeof p.name === 'string' ? p.name : '');
    const code = p.itemCode || p.modelNumber || '';

    return `- ID: ${p.id} | 名称: ${name || '未命名'} | 编号: ${code || '无'}`;
  }).join('\n');

  const prompt = buildPrompt(photoIds.length, photoListText);

  const provider = await getAIProvider();
  const model = provider.getConfig().model || provider.defaultModel;

  // 封裝重試邏輯
  const callAIWithValidation = async (currentPrompt: string): Promise<v.InferOutput<typeof GroupAnalysisSchema>> => {
    let lastError: string | null = null;
    
    for (let attempt = 0; attempt <= 1; attempt++) {
      const result = await executeAITask({
        task: 'cluster-groups',
        provider,
        model,
        messages: [{ role: 'user', content: currentPrompt }],
        prompt: currentPrompt,
        shouldNormalize: false
      });
      
      const resData = result.data as Record<string, unknown> | null;
      if (resData && resData._fallback) {
        throw new Error((resData._error as string) || 'AI group analysis failed');
      }

      const parsed = v.safeParse(GroupAnalysisSchema, result.data);
      if (parsed.success) {
        return parsed.output;
      }
      
      lastError = parsed.issues.map(i => `${i.path?.map((p: { key: unknown }) => String(p.key)).join('.')}: ${i.message}`).join('; ');
      logger.warn(`[AI] 格式錯誤，第 ${attempt + 1} 次重試`, { lastError });
      
      // 重試時附帶錯誤反饋
      currentPrompt = `${prompt}\n\n⚠️ 上次輸出格式錯誤：${lastError}\n請務必修正後重新按 Schema 輸出純 JSON。`;
    }
    
    throw new Error(`AI 合組分析格式無效: ${lastError}`);
  };

  const parsed = await callAIWithValidation(prompt);

  // ✅ 完整性校驗：ID 不重不漏
  const inputSet = new Set(photoIds);
  const returnedIds = parsed.groups.flatMap(g => g.photoIds);
  const returnedSet = new Set(returnedIds);
  
  // 檢查重複
  if (returnedIds.length !== returnedSet.size) {
    throw new Error('AI 返回的照片 ID 集合中存在重複');
  }

  // 檢查遺漏或超綱
  const missing = photoIds.filter(id => !returnedSet.has(id));
  const unknown = returnedIds.filter(id => !inputSet.has(id));

  if (missing.length > 0 || unknown.length > 0 || returnedIds.length !== photoIds.length) {
    throw new Error(`AI ID 校驗失敗: 遺漏 ${missing.length} 張, 超綱 ${unknown.length} 張 (總數應為 ${photoIds.length}, 實為 ${returnedIds.length})`);
  }

  return parsed;
}
