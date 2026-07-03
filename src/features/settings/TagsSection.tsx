import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useStore } from '#lib/store/index.js';
import { taskStore } from '#src/services/task/taskService.js';
import { executeTask } from '#lib/task-queue/index.js';
import React, { useState } from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { Button } from '#src/components/ui/Button.js';
import { useDisclosure } from '#src/hooks/core/useDisclosure.js';
import { Tag, AppSettings } from '#src/types/index.js';
import { TagItem } from "./TagItem.js";
import { PromptDialog } from "#src/components/ui/PromptDialog.js";

import { normalizeTagName } from "#lib/utils.js";
import { triggerRefreshTagHotScores } from "#src/services/tag/commands.js";
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import { FormProvider } from '#lib/forms/useFormField.js';
import * as v from 'valibot';

interface TagsSectionProps {
  tags: Tag[];
  settings: AppSettings | null;
  addTag: (name: string) => Promise<Tag>;
  updateTag: (id: number, data: Partial<Tag>) => Promise<boolean>;
  activeTagMenuId: number | null;
  setActiveTagMenuId: (id: number | null) => void;
  deleteTag: (id: number) => void;
  togglePin: (tagId: number) => void;
  setSettings: (s: AppSettings) => void;
  setHasChanges: (b: boolean) => void;
  debouncedSave: (s: AppSettings) => void;
  cardClass: string;
  buttonStyles: { accent: string };
}

export function TagsSection({
  tags,
  settings,
  addTag: rawAddTag,
  updateTag: rawUpdateTag,
  activeTagMenuId,
  setActiveTagMenuId,
  deleteTag,
  togglePin,
  setSettings,
  setHasChanges,
  debouncedSave,
  cardClass,
  buttonStyles,
}: TagsSectionProps) {
    // ...
    //   inside sort:
    // (settings?.pinned_tags || []).includes(String(a.id)) ? 1 : 0;
    // ...
    //   inside map:
    // isPinned={(settings?.pinned_tags || []).includes(String(tag.id))}
  
  const isRunning = useStore(taskStore, s => Array.from(s.tasks.values()).some((t) => t.state?.status === "processing"));

  const [isAddOpen, addDialog] = useDisclosure(false);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const { submit: runAddTag, isLoading: isAdding, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: v.object({ name: v.pipe(v.string(), v.minLength(2)) }),
    mutationFn: async ({ name }: { name: string }) => {
      const normalized = normalizeTagName(name);
      if (!normalized) return null;
      return await rawAddTag(normalized);
    },
    successMessage: '已新增標籤 / Tag added',
    errorMessage: '新增失敗 / Add failed'
  });

  const { submit: runUpdateTag, isLoading: isUpdating, fieldErrors: editFieldErrors, clearFieldError: editClearFieldError } = useFormSubmit({
    schema: v.object({ id: v.number(), name: v.pipe(v.string(), v.minLength(1)) }),
    mutationFn: async ({ id, name }: { id: number, name: string }) => {
      await rawUpdateTag(id, { name });
      return true;
    },
    successMessage: '已更新 / Updated',
    errorMessage: '更新失敗 / Update failed'
  });

  const handleRefreshHotScores = async () => {
    await executeTask({
      label: "刷新热门标签",
      type: "sync",
      silent: true,
      execute: async () => {
        await triggerRefreshTagHotScores();
        await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      }
    });
  };

  return (
    <section className={cardClass} id="section-tags">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          标签管理 / Tag Management
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">
          {(tags || []).length} Items
        </span>
      </div>
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Button 
           onClick={addDialog.open} 
           loading={isAdding} 
           className={buttonStyles.accent}
           leftIcon={!isAdding && <Icon name="plus" size={16} />}
           variant="primary"
        >
          新增標籤 / Add Tag
        </Button>
        <div className="flex flex-wrap items-center gap-3.5 bg-brand-navy/5 px-4 py-2 rounded-2xl border border-brand-navy/10">
          {/* Hot Limit */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-brand-navy uppercase tracking-widest flex items-center gap-1">
              <Icon name="heart" size={10} className="text-brand-gold fill-brand-gold" />{" "}
              Hot Limit
            </span>
            <input
              type="number"
              min={1}
              max={50}
              className="w-14 text-center bg-white border border-brand-navy/10 text-xs font-black text-brand-navy rounded-md py-1 outline-none focus:border-brand-gold"
              value={
                settings?.hotTagsCount !== undefined
                  ? settings.hotTagsCount
                  : 9
              }
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const num = isNaN(val) ? 9 : val;
                const nextSettings = {
                  ...settings,
                  hotTagsCount: num,
                } as AppSettings;
                setSettings(nextSettings);
                setHasChanges(true);
                debouncedSave(nextSettings);
              }}
            />
          </div>

          <div className="w-px h-8 bg-brand-navy/10"></div>

          {/* Hot Threshold */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-brand-navy uppercase tracking-widest flex items-center gap-1">
              热度阈值 / Hot Threshold
            </span>
            <input
              type="number"
              min={0}
              max={100}
              className="w-14 text-center bg-white border border-brand-navy/10 text-xs font-black text-brand-navy rounded-md py-1 outline-none focus:border-brand-gold"
              value={
                settings?.hotTagThreshold !== undefined
                  ? settings.hotTagThreshold
                  : 10
              }
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const num = isNaN(val) ? 10 : val;
                const nextSettings = {
                  ...settings,
                  hotTagThreshold: num,
                } as AppSettings;
                setSettings(nextSettings);
                setHasChanges(true);
                debouncedSave(nextSettings);
              }}
            />
          </div>

          <div className="w-px h-8 bg-brand-navy/10"></div>

          {/* Refresh Scores Button */}
          <button
            onClick={handleRefreshHotScores}
            disabled={isRunning}
            className="px-3 py-1.5 bg-brand-gold hover:bg-brand-gold/85 text-brand-navy font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="重新计算所有标签的使用次数和热度分值"
           >
            <Icon name="refresh-cw" size={12} />
            <span>刷新热门标签 / Refresh</span>
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {(Array.from(tags || []) as Tag[])
          .sort((a, b) => {
            const ap = (settings?.pinnedTags || []).includes(String(a.id)) ? 1 : 0;
            const bp = (settings?.pinnedTags || []).includes(String(b.id)) ? 1 : 0;
            if (ap !== bp) return bp - ap;
            return String(a.name).localeCompare(String(b.name));
          })
          .map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              activeTagMenuId={activeTagMenuId}
              setActiveTagMenuId={setActiveTagMenuId}
              handleUpdateTagName={(t) => {
                setEditingTag(t);
                editDialog.open();
              }}
              updateTag={rawUpdateTag}
              deleteTag={deleteTag}
              isPinned={(settings?.pinnedTags || []).includes(String(tag.id))}
              togglePin={togglePin}
            />
          ))}
      </div>

      <FormProvider fieldErrors={addFieldErrors} clearFieldError={addClearFieldError}>
        <PromptDialog
          open={isAddOpen}
          onOpenChange={addDialog.toggle}
          loading={isAdding}
          title="新增標籤"
          description="輸入標籤名稱:"
          onConfirm={async (name: string) => {
            if (!name.trim()) return false;
            return await runAddTag({ name });
          }}
        />
      </FormProvider>

      <FormProvider fieldErrors={editFieldErrors} clearFieldError={editClearFieldError}>
        <PromptDialog
          open={isEditOpen}
          onOpenChange={editDialog.toggle}
          loading={isUpdating}
          title="編輯標籤名 / Edit Tag Name"
          description="輸入新的標籤名稱 / Enter new tag name:"
          defaultValue={editingTag?.name}
          onConfirm={async (newName: string) => {
            if (editingTag && newName.trim()) {
              return await runUpdateTag({ id: editingTag.id, name: newName });
            }
            setEditingTag(null);
            return true;
          }}
        />
      </FormProvider>
    </section>
  );
}
