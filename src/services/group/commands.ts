import { type Result, ok, err } from '@/lib/errorFactory';
import { supabase } from '../../lib/supabase';
import { ProductGroup } from '../../types';
import { 
  updateGroupInCloud as updateGroup,
  upsertGroupInCloud as upsertGroup,
  createGroupInCloud as createGroup,
  deleteGroupFromCloud as deleteGroup
} from '../groupMutationService';

export const saveGroup = async (group: Partial<ProductGroup> & { id: string }): Promise<Result<void, Error>> => {
  try {
    await upsertGroup(group);
    return ok(undefined);
  } catch (errValue) {
    return err(errValue instanceof Error ? errValue : new Error(String(errValue)));
  }
};

export const deleteGroupFromCloud = async (id: string): Promise<Result<void, Error>> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    await deleteGroup(id, userId);
    return ok(undefined);
  } catch (errValue) {
    return err(errValue instanceof Error ? errValue : new Error(String(errValue)));
  }
};

export { updateGroup, upsertGroup, createGroup };
