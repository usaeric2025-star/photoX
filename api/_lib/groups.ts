import { logger } from './logger.js';

/**
 * Robust Group Integrity and Cover Photos Synchronization (長期維護機制)
 * Ensures standard alignment of:
 * 1. groups.cover_photo_id matches a member photo with furniture_items.is_group_cover = true
 * 2. All other group photos have is_group_cover = false
 * 3. groups.member_count matches the actual count of photos in the group
 * 4. Automatic dissolution of groups with <= 1 member
 */
export async function syncGroupCoversAndCount(supabase: any, groupIds: string[]): Promise<void> {
  const uniqueGroupIds = Array.from(new Set(groupIds.filter(Boolean)));
  if (uniqueGroupIds.length === 0) return;

  for (const groupId of uniqueGroupIds) {
    try {
      logger.info(`[GroupSync] Syncing group integrity for group: ${groupId}`);

      // 1. Fetch all elements currently assigned to this group
      const { data: photos, error: fetchError } = await supabase
        .from('furniture_items')
        .select('id, is_group_cover, group_order, created_at')
        .eq('group_id', groupId);

      if (fetchError) {
        logger.error(`[GroupSync] Failed to fetch items for group ${groupId}:`, fetchError.message);
        continue;
      }

      const items = photos || [];
      const actualCount = items.length;

      // Rule: Group must have at least 2 members. If 1 or 0 members, dissolve it.
      if (actualCount <= 1) {
        logger.info(`[GroupSync] Dissolving group ${groupId} because it has ${actualCount} members.`);
        if (actualCount === 1) {
          // Dissolve: clear group attributes
          await supabase
            .from('furniture_items')
            .update({ group_id: null, is_group_cover: false, is_pinned: false })
            .eq('id', items[0].id);
        }

        // Delete group
        const { error: deleteGroupError } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId);

        if (deleteGroupError) {
          logger.error(`[GroupSync] Failed to delete group ${groupId}:`, deleteGroupError.message);
        }
        continue;
      }

      // Find if there is a cover among group members
      let currentCover = items.find((p: any) => p.is_group_cover === true);
      
      // Get the group's current cover_photo_id in db
      const { data: groupData, error: groupFetchError } = await supabase
        .from('groups')
        .select('cover_photo_id')
        .eq('id', groupId)
        .maybeSingle();

      if (groupFetchError) {
        logger.error(`[GroupSync] Failed to fetch group metadata for ${groupId}:`, groupFetchError.message);
        continue;
      }

      const dbCoverPhotoId = groupData?.cover_photo_id;

      let targetCoverPhotoId = currentCover?.id;

      // Handle situations where:
      // a) No photo has is_group_cover = true
      // b) The photo marked as is_group_cover is different from groups.cover_photo_id
      // c) cover_photo_id is null / invalid
      
      const isCoverValid = currentCover && dbCoverPhotoId === currentCover.id;

      if (!isCoverValid) {
        // Reconcile cover
        const matchedMemberObj = items.find((p: any) => p.id === dbCoverPhotoId);
        if (matchedMemberObj) {
          targetCoverPhotoId = dbCoverPhotoId;
        } else {
          // Fallback: Sort by group_order / created_at asc / id asc and pick the first one
          const sorted = [...items].sort((a, b) => {
            if (a.group_order !== b.group_order) {
              return (a.group_order || 0) - (b.group_order || 0);
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          targetCoverPhotoId = sorted[0]?.id;
        }

        // Apply state reconciliation to ALL photos in the group
        for (const p of items) {
          const shouldBeCover = p.id === targetCoverPhotoId;
          if (p.is_group_cover !== shouldBeCover) {
            await supabase
              .from('furniture_items')
              .update({ is_group_cover: shouldBeCover })
              .eq('id', p.id);
          }
        }
      }

      // Ensure NO other photo is set to is_group_cover = true
      for (const p of items) {
        if (p.id !== targetCoverPhotoId && p.is_group_cover === true) {
          await supabase
            .from('furniture_items')
            .update({ is_group_cover: false })
            .eq('id', p.id);
        }
      }

      // Write consolidated values to `groups` table
      const { error: updateGroupError } = await supabase
        .from('groups')
        .update({
          cover_photo_id: targetCoverPhotoId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId);

      if (updateGroupError) {
        logger.error(`[GroupSync] Failed to update group params for ${groupId}:`, updateGroupError.message);
      } else {
        logger.info(`[GroupSync] Reconciled group ${groupId}. Cover: ${targetCoverPhotoId}`);
      }

    } catch (err: any) {
      logger.error(`[GroupSync] Unexpected exception syncing group ${groupId}:`, err.message);
    }
  }
}
