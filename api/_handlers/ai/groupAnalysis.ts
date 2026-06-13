import { type } from 'arktype';
import { getSupabaseAdmin } from '../../_lib/supabase.js';
import { getAIProvider } from '../../_lib/ai/providerFactory.js';
import { extractJSON } from '../../_lib/ai/utils.js';
import { executeAITask } from '../../_lib/ai/executor.js';

// 1. 輸出 Schema（與提示詞嚴格對應）
export const GroupAnalysisSchema = type({
  groups: type({
    name: 'string', // 中文
    name_en: 'string',
    name_ms: 'string',
    description: 'string',
    photoIds: 'string[]'
  }).array()
});

// 2. 強化提示詞
const buildPrompt = (photoCount: number, photoList: string) => `你是一個專業的攝影作品分類專家。

## 任務
分析以下 ${photoCount} 張照片，將它們分組為產品系列。

## ⚠️ 硬性要求（違反將導致處理失敗）
1. 輸出純 JSON，不要包含 Markdown 代碼塊、註釋或其他文字。
2. 格式嚴格匹配以下 Schema（ArkType 相容）：
   { "groups": [{ "name": "中文名稱", "name_en": "English", "name_ms": "Bahasa Malaysia", "description": "描述", "photoIds": ["UUID"] }] }
3. 完整性校驗：每張照片的 ID 回傳總數必須等於輸入的 ${photoCount} 個，且每個 ID 必須屬於輸入列表。
4. 禁止使用「其他」「雜項」「未分類」等佔位詞。
5. 合組數量建議 2-8 個，視內容而定。

## 判斷標準
- 視覺風格、拍攝場景一致 → 同一組
- 同一產品不同角度、光影 → 同一組
- 完全無關的主題 → 不同組

## 照片列表
${photoList}

請輸出 JSON：`;

export async function processGroupAnalysis(photoIds: string[]) {
  if (photoIds.length === 0) throw new Error('Input photo IDs list is empty');
  
  const supabase = await getSupabaseAdmin();
  
  const { data: photos } = await supabase
    .from('furniture_items')
    .select('id, name, description')
    .in('id', photoIds);
    
  if (!photos || photos.length === 0) {
    throw new Error('未找到請求的照片詳情，無法分析');
  }

  const photoListText = photos.map((p: Record<string, any>) => {
    const name = typeof p.name === 'object' ? (p.name as any)?.zh : p.name;
    const desc = typeof p.description === 'object' ? (p.description as any)?.zh : p.description;
    return `- ID: ${p.id} | Name: ${name || 'N/A'} | Desc: ${desc || 'N/A'}`;
  }).join('\n');

  const prompt = buildPrompt(photoIds.length, photoListText);

  const provider = await getAIProvider('', supabase);
  const model = (provider as any).config.model;

// 封裝重試邏輯
  const callAIWithValidation = async (currentPrompt: string): Promise<typeof GroupAnalysisSchema.infer> => {
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
      
      if (result.data && (result.data as any)._fallback) {
        throw new Error((result.data as any)._error || 'AI group analysis failed');
      }

      const parsed = GroupAnalysisSchema(result.data);
      if (!(parsed instanceof type.errors)) {
        return parsed;
      }
      
      lastError = parsed.summary;
      console.warn(`[AI] 格式錯誤，第 ${attempt + 1} 次重試`, lastError);
      
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
