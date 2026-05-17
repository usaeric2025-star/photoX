import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { Tag, AppSettings } from '../../types';
import { TagItem } from './TagItem';

interface TagsSectionProps {
  tags: Tag[];
  settings: AppSettings | null;
  handleAddTag: () => void;
  activeTagMenuId: string | null;
  setActiveTagMenuId: (id: string | null) => void;
  handleUpdateTagName: (tag: Tag) => void;
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
  handleAddTag,
  activeTagMenuId,
  setActiveTagMenuId,
  handleUpdateTagName,
  deleteTag,
  togglePin,
  setSettings,
  setHasChanges,
  debouncedSave,
  cardClass,
  buttonStyles
}) => {
  return (
    <section className={cardClass} id="section-tags">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          常用标签
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{(tags || []).length} 个项目</span>
      </div>
      <div className="flex gap-2 items-center">
        <button onClick={handleAddTag} className={buttonStyles.accent}>
          <Plus size={16} /> 新增标签
        </button>
        <div className="flex items-center gap-2 bg-brand-navy/5 px-3 py-1.5 rounded-full border border-brand-navy/10 ml-auto h-full">
           <span className="text-[10px] font-black text-brand-navy uppercase tracking-widest flex items-center gap-1">
             <Heart size={12} className="text-brand-gold fill-brand-gold" /> 推荐数量
           </span>
           <input 
             type="number"
             min={1}
             max={50}
             className="w-12 text-center bg-white border border-brand-navy/10 text-xs font-black text-brand-navy rounded-md py-1 outline-none focus:border-brand-gold"
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
