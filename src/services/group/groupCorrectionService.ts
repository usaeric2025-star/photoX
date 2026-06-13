import { supabase } from '@/lib/supabase';

type CorrectionType = 'rename' | 'reorder' | 'merge' | 'split' | 'add_member' | 'remove_member';

export async function logAndApplyCorrection(params: {
  groupId: string;
  type: CorrectionType;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  applyFn: () => Promise<void>;
}) {
  // 先執行實際修改
  await params.applyFn();

  // 再記錄日誌（失敗不阻塞主流程）
  try {
    await supabase.from('group_correction_logs').insert({
      group_id: params.groupId,
      before_snapshot: params.before,
      after_snapshot: params.after,
      correction_type: params.type
    });
  } catch (e) {
    console.error('[CorrectionLog] 記錄失敗', e);
  }
}
