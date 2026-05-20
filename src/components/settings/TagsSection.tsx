import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { Tag, AppSettings } from '../../types';
import { TagItem } from './TagItem';
import { useGalleryStore } from '../../store';
import { useFeedback } from '../../hooks';
import { normalizeTagName } from '../../utils/stringHelper';

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

export const TagsSection: React.FC<TagsSectionProps> = ({
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
  buttonStyles
}) => {
  const { setPromptDialog } = useGalleryStore();
  const { showSuccess, showError } = useFeedback();

  const handleAddTag = () => {
    setPromptDialog({
      title: '新增标签',
      message: '输入标签名称:',
      onSubmit: async (name: string) => {
        if (!name.trim()) return;
        const normalized = name.trim().toUpperCase();
        try {
          await addTag(normalized);
        } catch (error: any) {
          showError(error, '添加标签失败');
        }
      }
    });
  };

  const handleUpdateTagName = (tag: Tag) => {
    setPromptDialog({
      title: '编辑标签名 / Edit Tag Name',
      message: '输入新的标签名称 / Enter new tag name:',
      placeholder: tag.name,
      onSubmit: async (newName) => {
        const normalized = normalizeTagName(newName);
        if (normalized && normalized !== tag.name) {
          await updateTag(tag.id, { name: normalized });
        }
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
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{(tags || []).length} Items</span>
      </div>
      <div className="flex gap-2 items-center">
        <button onClick={handleAddTag} className={buttonStyles.accent}>
          <Plus size={16} /> 新增标签 / Add Tag
        </button>
        <div className="flex flex-wrap items-center gap-3 bg-brand-navy/5 px-4 py-2 rounded-2xl border border-brand-navy/10 ml-auto h-full">
           <div className="flex flex-col gap-0.5">
             <span className="text-[9px] font-black text-brand-navy uppercase tracking-widest flex items-center gap-1">
               <Heart size={10} className="text-brand-gold fill-brand-gold" /> Hot Limit
             </span>
             <input 
               type="number"
               min={1}
               max={50}
               className="w-14 text-center bg-white border border-brand-navy/10 text-xs font-black text-brand-navy rounded-md py-1 outline-none focus:border-brand-gold"
               value={settings?.hotTagsCount !== undefined ? settings.hotTagsCount : 9}
               onChange={(e) => {
                 const val = parseInt(e.target.value);
                 const num = isNaN(val) ? 9 : val;
                 const nextSettings = { ...settings, hotTagsCount: num } as AppSettings;
                 setSettings(nextSettings);
                 setHasChanges(true);
                 debouncedSave(nextSettings);
               }}
             />
           </div>
           
           <div className="w-px h-8 bg-brand-navy/10 mx-1"></div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {(Array.from(tags || []) as Tag[]).sort((a, b) => {
           const ap = (settings?.pinnedTags || []).includes(a.id) ? 1 : 0;
           const bp = (settings?.pinnedTags || []).includes(b.id) ? 1 : 0;
           if (ap !== bp) return bp - ap;
           return String(a.name).localeCompare(String(b.name));
        }).map((tag) => (
          <TagItem 
            key={tag.id}
            tag={tag}
            activeTagMenuId={activeTagMenuId}
            setActiveTagMenuId={setActiveTagMenuId}
            handleUpdateTagName={handleUpdateTagName}
            deleteTag={deleteTag}
            isPinned={(settings?.pinnedTags || []).includes(tag.id)}
            togglePin={togglePin}
          />
        ))}
      </div>
    </section>
  );
};
