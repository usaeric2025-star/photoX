import { type } from 'arktype';
import { getSupabaseAdmin } from '../../_lib/supabase.js';
import { getAIProvider } from '../../_lib/ai/providerFactory.js';
import { extractJSON } from '../../_lib/ai/utils.js';
import { executeAITask } from '../../_lib/ai/executor.js';

// 1. 輸出 Schema（與提示詞嚴格對應）
export const GroupAnalysisSchema = type({
  groups: type({
    name: 'string',
    name_en: 'string',
    name_ms: 'string',
    description: 'string',
    photoIds: 'string[]'
  }).array()
});

// 2. 強化提示詞
const buildPrompt = (photoCount: number, photoList: string) => `你是一個專業的攝影作品分類專家。

## 任務
分析以下 ${photoCount} 張照片，將它們分組為產品/主題系列。

## ⚠️ 硬性要求（違反將導致處理失敗）
1. 輸出純 JSON，不要包含 Markdown 代碼塊或其他文字
2. 格式嚴格匹配以下 Schema：
   { "groups": [{ "name": "中文名稱(2-6字)", "name_en": "English", "name_ms": "Bahasa Malaysia", "description": "簡短描述(10-30字)", "photoIds": ["uuid1","uuid2"] }] }
3. 每張照片必須屬於且僅屬於一個合組，不能遺漏
4. 合組數量 2-8 個
5. 禁止使用「其他」「雜項」「未分類」等佔位詞
6. photoIds 必須包含該組所有照片的完整 ID

## 判斷標準
- 視覺風格一致 → 同一組
- 相同拍攝場景/光影 → 同一組
- 同一產品不同角度 → 同一組
- 完全無關的主題 → 不同組

## 照片列表
${photoList}

請輸出 JSON：`;

export async function processGroupAnalysis(photoIds: string[]) {
  const supabase = await getSupabaseAdmin();
  
  // 獲取這些照片的詳細信息用來構造 Prompt，因為單有 ID AI 不知道是什麼
  // 我們需要獲取名稱、描述、分類、標籤等
  const { data: photos } = await supabase
    .from('furniture_items')
    .select('id, name, original_name, description')
    .in('id', photoIds);
    
  if (!photos) {
    throw new Error('未找到請求的照片');
  }

  // 確保順序對應，或者直接列出
  const photoListText = photos.map((p: Record<string, any>) => `- ID: ${p.id} | Name: ${typeof p.name === 'object' ? (p.name as any)?.zh : p.name} | Desc: ${typeof p.description === 'object' ? (p.description as any)?.zh : p.description}`).join('\n');
  const prompt = buildPrompt(photoIds.length, photoListText);

  const provider = await getAIProvider('', supabase);
  const model = (provider as any).config.model;

  // 第一次嘗試
  let result = await executeAITask({
    task: 'cluster-groups',
    provider,
    model,
    messages: [{ role: 'user', content: prompt }],
    prompt,
    shouldNormalize: false
  });
  
  if (result.data && (result.data as any)._fallback) {
    throw new Error((result.data as any)._error || 'AI group analysis failed');
  }

  let parsed = GroupAnalysisSchema(result.data);

  // 校驗失敗 → 帶錯誤反饋重試一次
  if (parsed instanceof type.errors) {
    console.warn('[AI] 合組分析輸出格式錯誤，重試中...', parsed.summary);
    const retryPrompt = `${prompt}\n\n⚠️ 上次輸出格式錯誤：${parsed.summary}\n請嚴格按 Schema 重新輸出純 JSON`;
    
    result = await executeAITask({
        task: 'cluster-groups-retry',
        provider,
        model,
        messages: [{ role: 'user', content: retryPrompt }],
        prompt: retryPrompt,
        shouldNormalize: false
    });
    
    if (result.data && (result.data as any)._fallback) {
        throw new Error((result.data as any)._error || 'AI group analysis retry failed');
    }
    parsed = GroupAnalysisSchema(result.data);
  }

  // 重試仍失敗 → 拋出明確錯誤
  if (parsed instanceof type.errors) {
    throw new Error(`AI 合組分析輸出格式無效: ${parsed.summary}`);
  }

  // ✅ 完整性校驗：返回的 photoIds 總數必須等於輸入照片數
  // 以及每個返回的 ID 都必須是輸入的一部分
  const inputSet = new Set(photoIds);
  const returnedIds = new Set<string>(parsed.groups.flatMap(g => g.photoIds));
  
  // To avoid failing entirely when AI hallucinates a tiny bit, 
  // maybe we throw only if it's way off, or just remove hallucinations.
  // The user says "返總數必須等於輸入照片數", so throw logic.
  
  let validCount = 0;
  for (const rid of returnedIds) {
      if (inputSet.has(rid as string)) validCount++;
  }

  if (validCount !== photoIds.length) {
    throw new Error(`AI 遺漏或幻覺照片: 輸入 ${photoIds.length} 張，有效返回 ${validCount} 張`);
  }

  return parsed;
}
