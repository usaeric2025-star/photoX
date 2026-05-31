import React from 'react';
import { TagsSection } from './TagsSection';
import { Tag, AppSettings } from '@/types';

interface TagsManagerProps {
  tags: Tag[];
  settings: AppSettings;
  addTag: (name: string) => Promise<Tag>;
  updateTag: (id: string, data: Partial<Tag>) => Promise<boolean>;
  activeTagMenuId: string | null;
  setActiveTagMenuId: (id: string | null) => void;
  deleteTag: (id: string) => void;
  togglePin: (tagId: string) => void;
  setSettings: (s: AppSettings) => void;
  setHasChanges: (v: boolean) => void;
  debouncedSave: (s: AppSettings) => void;
  cardClass: string;
  buttonStyles: any;
}

export function TagsManager(props: TagsManagerProps) {
  return <TagsSection {...props} />;
};
