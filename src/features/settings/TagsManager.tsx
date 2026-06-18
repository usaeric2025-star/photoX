import React from 'react';
import { TagsSection } from './TagsSection';
import { Tag, AppSettings } from '@/types';

interface TagsManagerProps {
  tags: Tag[];
  settings: AppSettings;
  addTag: (name: string) => Promise<Tag>;
  updateTag: (id: number, data: Partial<Tag>) => Promise<boolean>;
  activeTagMenuId: number | null;
  setActiveTagMenuId: (id: number | null) => void;
  deleteTag: (id: number) => void;
  togglePin: (tagId: number) => void;
  setSettings: (s: AppSettings) => void;
  setHasChanges: (v: boolean) => void;
  debouncedSave: (s: AppSettings) => void;
  cardClass: string;
  buttonStyles: { [key in 'primary' | 'secondary' | 'accent']: string };
}

export function TagsManager(props: TagsManagerProps) {
  return <TagsSection {...props} />;
};
