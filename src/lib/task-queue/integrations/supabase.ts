import { supabase, isSupabaseConfigured } from '#lib/supabase.js';
import { logger } from '#lib/logger.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Task, TaskType } from '#lib/task-queue/types.js';

export const taskTable = {
  // 插入新任務
  insert: async (task: Task) => {
    if (!isSupabaseConfigured) {
      logger.debug('[Task] Supabase not configured, skipping persistent insert.');
      return;
    }
    // 優先使用任務自帶的 userId，否則嘗試從 session 獲取
    let userId = task.userId;
    
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    const { error } = await supabase.from('tasks').insert({
      id: task.id,
      label: task.label,
      type: task.type,
      status: 'queued',
      meta: task.meta,
      user_id: userId || null,
      created_at: new Date(task.createdAt).toISOString(),
    });

    if (error) {
      ErrorFactory.handle(error, { context: '[Task] Insert error', silent: true });
    } else {
      logger.debug('[Task] Insert success:', task.id);
    }
  },

  // 更新狀態
  updateStatus: async (id: string, status: string, data?: unknown) => {
    if (!isSupabaseConfigured) return;
    const payload: Record<string, unknown> = { status };
    if (data !== undefined) payload.data = data;
    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id);
    if (error) ErrorFactory.handle(error, { context: '[Task] Update error', silent: true });
  },

  // 恢復未完成任務
  restorePending: async (): Promise<Task[]> => {
    if (!isSupabaseConfigured) {
      return [];
    }
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: true });

    if (error) {
      ErrorFactory.handle(error, { context: '[Task] Restore error', silent: true });
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      label: row.label as string,
      type: row.type as TaskType,
      state: row.status === 'processing' 
        ? { status: 'processing', progress: 0 }
        : { status: 'queued' as const },
      createdAt: new Date(row.created_at as string).getTime(),
      meta: row.meta as Record<string, unknown> || {},
      // ⚠️ execute 函數需要業務層重新綁定
      execute: async () => {},
    }));
  }
};
