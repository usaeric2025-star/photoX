import { supabase } from '@/lib/supabase';

// ✅ 寫入草稿
export async function saveDraftGroups(
  groups: Array<{ name: string; name_en: string; name_ms: string; description: string; photoIds: string[] }>,
  sessionId: string
) {
  const { data, error } = await supabase
    .from('groups')
    .insert(groups.map(g => ({
      name: g.name,
      name_en: g.name_en,
      name_ms: g.name_ms,
      description: g.description,
      photo_ids: g.photoIds,
      status: 'draft',
      metadata: { sessionId }
    })))
    .select(); // ← 關鍵：返回完整記錄包括 id 和 status

  if (error) throw error;
  return data;
}

// ✅ 確認合組
export async function confirmGroup(groupId: string) {
  const { error } = await supabase
    .from('groups')
    .update({ status: 'confirmed' })
    .eq('id', groupId);
  if (error) throw error;
}

// ✅ 刪除草稿（安全防護：只能刪 draft）
export async function deleteDraft(groupId: string) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('status', 'draft');
  if (error) throw error;
}
