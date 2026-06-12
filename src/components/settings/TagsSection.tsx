import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useTaskExecutor, useTasks } from "@/hooks";
import React, { useState } from "react";
import { Plus, Heart, RefreshCw } from "lucide-react";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { Tag, AppSettings } from "../../types";
import { TagItem } from "./TagItem";
import { PromptDialog } from "@/components/ui/PromptDialog";

import { toast } from 'sonner';
import { normalizeTagName } from "@/lib/utils";
import { triggerRefreshTagHotScores } from "../../services/tag/commands";
import { useQueryClient } from "@tanstack/react-query";

interface TagsSectionProps {
  tags: Tag[];
  settings: AppSettings | null;
  addTag: (name: string) => Promise<Tag>;
  updateTag: (id: string, data: Partial<Tag>) => Promise<boolean>;
  activeTagMenuId: string | null;
  setActiveTagMenuId: (id: string | null) => void;
  deleteTag: (id: string) => void;
  togglePin: (tagId: string) => void;
  setSettings: (s: AppSettings) => void;
  setHasChanges: (b: boolean) => void;
  debouncedSave: (s: AppSettings) => void;
  cardClass: string;
  buttonStyles: { accent: string };
}

export function TagsSection({
  tags,
  settings,
  addTag,
  updateTag,
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
  
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();
  const isRunning = tasks.some((t) => t.status === "running");
  const queryClient = useQueryClient();

  const [isAddOpen, addDialog] = useDisclosure(false);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const handleRefreshHotScores = async () => {
    await runTask(
      "刷新热门标签",
      async () => {
        await triggerRefreshTagHotScores();
        await queryClient.invalidateQueries({ queryKey: ["tags"] });
      },
      { showSuccessToast: true, silent: true },
    );
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
        <button onClick={addDialog.open} className={buttonStyles.accent}>
          <Plus size={16} /> 新增标签 / Add Tag
        </button>
        <div className="flex flex-wrap items-center gap-3.5 bg-brand-navy/5 px-4 py-2 rounded-2xl border border-brand-navy/10">
          {/* Hot Limit */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-brand-navy uppercase tracking-widest flex items-center gap-1">
              <Heart size={10} className="text-brand-gold fill-brand-gold" />{" "}
              Hot Limit
            </span>
            <input
              type="number"
              min={1}
              max={50}
              className="w-14 text-center bg-white border border-brand-navy/10 text-xs font-black text-brand-navy rounded-md py-1 outline-none focus:border-brand-gold"
              value={
                settings?.hot_tags_count !== undefined
                  ? settings.hot_tags_count
                  : 9
              }
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const num = isNaN(val) ? 9 : val;
                const nextSettings = {
                  ...settings,
                  hot_tags_count: num,
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
                settings?.hot_tag_threshold !== undefined
                  ? settings.hot_tag_threshold
                  : 10
              }
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const num = isNaN(val) ? 10 : val;
                const nextSettings = {
                  ...settings,
                  hot_tag_threshold: num,
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
            <RefreshCw size={12} />
            <span>刷新热门标签 / Refresh</span>
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {(Array.from(tags || []) as Tag[])
          .sort((a, b) => {
            const ap = (settings?.pinned_tags || []).includes(a.id) ? 1 : 0;
            const bp = (settings?.pinned_tags || []).includes(b.id) ? 1 : 0;
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
              updateTag={updateTag}
              deleteTag={deleteTag}
              isPinned={(settings?.pinned_tags || []).includes(tag.id)}
              togglePin={togglePin}
            />
          ))}
      </div>

      <PromptDialog
        open={isAddOpen}
        onOpenChange={addDialog.toggle}
        title="新增标签"
        description="输入标签名称:"
        onConfirm={async (name: string) => {
          if (!name.trim()) return;
          const normalized = name.trim().toUpperCase();
          try {
            await addTag(normalized);
          } catch (error: unknown) {
            // Error mapped internally by mutation
          }
        }}
      />

      <PromptDialog
        open={isEditOpen}
        onOpenChange={editDialog.toggle}
        title="编辑标签名 / Edit Tag Name"
        description="输入新的标签名称 / Enter new tag name:"
        placeholder={editingTag?.name}
        onConfirm={async (newName: string) => {
          const normalized = normalizeTagName(newName);
          if (normalized && editingTag && normalized !== editingTag.name) {
            await updateTag(editingTag.id, { name: normalized });
          }
          setEditingTag(null);
        }}
      />
    </section>
  );
}
