import { errorFactory, success, fromThrowableAsync } from '@/lib/errorFactory';
import type { AppResult } from '@/lib/errorFactory';
import { supabase } from '../../lib/supabase';
import { ProductGroup } from '../../types';
import { 
  updateGroupInCloud as updateGroup,
  upsertGroupInCloud as upsertGroup,
  createGroupInCloud as createGroup,
  deleteGroupFromCloud as deleteGroup
} from '../groupMutationService';

export const saveGroup = async (group: Partial<ProductGroup> & { id: string }): Promise<AppResult<void>> => {
    const result = await fromThrowableAsync(() => upsertGroup(group), 'saveGroup');
    if (!result.ok) return result;
    return success(undefined);
};

export const deleteGroupFromCloud = async (id: string): Promise<AppResult<void>> => {
    const result = await fromThrowableAsync(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        await deleteGroup(id, userId);
    }, 'deleteGroupFromCloud');
    
    if (!result.ok) return result;
    return success(undefined);
};

export { updateGroup, upsertGroup, createGroup };
