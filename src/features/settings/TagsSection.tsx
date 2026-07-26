import React, { useState } from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { Button } from '#src/components/ui/Button.js';
import { useDisclosure, useDebounceFn } from '#src/hooks/core/index.js';
import { Tag, AppSettings } from '#src/types/index.js';
import { TagItem } from "./TagItem.js";
import { PromptDialog } from "#src/components/ui/PromptDialog.js";
import { logger } from '#lib/logger.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { normalizeTagName } from "#lib/utils.js";
import { api } from "#lib/api.js";
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import { FormProvider } from '#lib/forms/useFormField.js';
import * as v from 'valibot';
import { useTags, useSettings, useTagMutations, useTranslation } from '#src/hooks/index.js';
import { useSettingsText } from '#src/hooks/useSettingsText.js';
import { useAtomValue } from "jotai";
import { tasksAtom } from '#src/lib/task-queue/taskStore.js';
import { executeTask } from '#lib/task-queue/index.js';

interface TagsSectionProps {
  cardClass: string;
  buttonStyles: { accent: string };
}

/**
 * TagsSection
 * 
 * 整合标签管理、热门标签设置与手动刷新。
 */
export function TagsSection({
  cardClass,
  buttonStyles,
}: TagsSectionProps) {
  const { tags = [] } = useTags();
  const { settings, updateSettings } = useSettings();
  const tagMutations = useTagMutations();
  const text = useSettingsText();
  
  const [isAddOpen, addDialog] = useDisclosure(false);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const tasks = useAtomValue(tasksAtom);
  const isRunning = Array.from(tasks.values()).some((t) => t.state?.status === "processing");

  const { run: debouncedSave } = useDebounceFn((newSettings: AppSettings) => {
    updateSettings(newSettings).catch(e => ErrorFactory.handle(e, { context: '[TagsSection] debouncedSave failed', silent: true }));
  }, 1500);

  const togglePin = (tagId: number) => {
    if (!settings) return;
    const currentPinned = (settings.pinnedTags || []);
    const tagIdStr = String(tagId);
    let nextPinned;
    if (currentPinned.includes(tagIdStr)) {
      nextPinned = currentPinned.filter((id) => id !== tagIdStr);
    } else {
      nextPinned = [...currentPinned, tagIdStr];
    }
    const nextSettings = { ...settings, pinnedTags: nextPinned };
    void updateSettings(nextSettings);
    debouncedSave(nextSettings);
  };

  const { submit: runAddTag, isLoading: isAdding, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: v.object({ name: v.pipe(v.string(), v.minLength(1, '标签名称不能为空')) }),
    mutationFn: async ({ name }: { name: string }) => {
      const normalized = normalizeTagName(name);
      if (!normalized) return;
      await tagMutations.create.mutateAsync({ name: normalized });
    },
    successMessage: '已新增标签',
  });

  const { submit: runUpdateTag, isLoading: isUpdating, fieldErrors: editFieldErrors, clearFieldError: editClearFieldError } = useFormSubmit({
    schema: v.object({ id: v.string(), name: v.pipe(v.string(), v.minLength(1, '标签名称不能为空')) }),
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      await tagMutations.edit.mutateAsync({ id, updates: { name } });
    },
    successMessage: '已更新标签',
  });

  const handleRefreshHotScores = async () => {
    await executeTask({
      label: "刷新热门标签",
      type: "sync",
      silent: true,
      execute: async () => {
        await api.tags['refresh-hot-scores'].$post();
        await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      }
    });
  };

  const sortedTags = [...tags].sort((a, b) => {
    const ap = (settings?.pinnedTags || []).includes(String(a.id)) ? 1 : 0;
    const bp = (settings?.pinnedTags || []).includes(String(b.id)) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return String(a.name).localeCompare(String(b.name));
  });

  return (
    <section className={cardClass} id="section-tags">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          {text.tags.title}
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">
          {tags.length} {text.categories.items}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Button 
           id="add-tag-btn"
           onClick={addDialog.open} 
           loading={isAdding} 
           className={buttonStyles.accent}
           leftIcon={!isAdding && <Icon name="plus" size={16} />}
           variant="primary"
        >
          {text.tags.add}
        </Button>

        <div className="flex flex-wrap items-center gap-3.5 bg-brand-navy/5 px-4 py-2 rounded-2xl border border-brand-navy/10">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-brand-navy uppercase tracking-widest flex items-center gap-1">
              <Icon name="heart" size={10} className="text-brand-gold fill-brand-gold" />
              {text.tags.hotMax}
            </span>
            <input
              id="hot-tags-count-input"
              type="number"
              min={1}
              max={50}
              className="w-14 text-center bg-white border border-brand-navy/10 text-xs font-black text-brand-navy rounded-md py-1 outline-none focus:border-brand-gold"
              value={settings?.hotTagsCount ?? 9}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const num = isNaN(val) ? 9 : val;
                const nextSettings = { ...settings, hotTagsCount: num } as AppSettings;
                void updateSettings(nextSettings);
                debouncedSave(nextSettings);
              }}
            />
          </div>

          <div className="w-px h-8 bg-brand-navy/10"></div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-brand-navy uppercase tracking-widest flex items-center gap-1">
              {text.tags.hotThreshold}
            </span>
            <input
              id="hot-tag-threshold-input"
              type="number"
              min={0}
              max={100}
              className="w-14 text-center bg-white border border-brand-navy/10 text-xs font-black text-brand-navy rounded-md py-1 outline-none focus:border-brand-gold"
              value={settings?.hotTagThreshold ?? 10}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const num = isNaN(val) ? 10 : val;
                const nextSettings = { ...settings, hotTagThreshold: num } as AppSettings;
                void updateSettings(nextSettings);
                debouncedSave(nextSettings);
              }}
            />
          </div>

          <button
            id="refresh-hot-tags-btn"
            onClick={handleRefreshHotScores}
            disabled={isRunning}
            className="px-3 py-1.5 bg-brand-gold hover:bg-brand-gold/85 text-brand-navy font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
           >
            <Icon name="refresh-cw" size={12} />
            <span>{text.tags.refreshHot}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {sortedTags.map((tag) => (
          <TagItem
            key={tag.id}
            tag={tag}
            handleUpdateTagName={(t) => {
              setEditingTag(t);
              editDialog.open();
            }}
            deleteTag={(id) => tagMutations.remove.mutateAsync(id)}
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
          title={text.tags.add}
          description={text.tags.placeholder}
          onConfirm={async (name: string) => {
            if (!name.trim()) return false;
            await runAddTag({ name });
            return true;
          }}
        />
      </FormProvider>

      <FormProvider fieldErrors={editFieldErrors} clearFieldError={editClearFieldError}>
        <PromptDialog
          open={isEditOpen}
          onOpenChange={editDialog.toggle}
          loading={isUpdating}
          title={text.tags.edit}
          description={text.tags.editPromptDescription}
          defaultValue={editingTag?.name}
          onConfirm={async (newName: string) => {
            if (editingTag && newName.trim()) {
              await runUpdateTag({ id: editingTag.id, name: newName });
              setEditingTag(null);
              return true;
            }
            return false;
          }}
        />
      </FormProvider>
    </section>
  );
}
