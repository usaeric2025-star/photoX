import { supabase } from '@/lib/supabase';

// ✅ AI 分析完成後直接以 confirmed 狀態寫入
export async function saveGeneratedGroups(
  groups: Array<{ name: string; name_en: string; name_ms: string; description: string; photoIds: string[] }>,
  sessionId: string
) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const { data, error } = await supabase
    .from('groups')
    .insert(groups.map(g => ({
      name: { zh: g.name, en: g.name_en, ms: g.name_ms },
      description: { zh: g.description },
      photo_ids: g.photoIds,
      status: 'confirmed',     // ← 直接生效，無需審核
      user_id: userId,
      metadata: { sessionId }
    })))
    .select();

  if (error) throw error;
  return data;
}
