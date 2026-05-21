export * from './ai';
export * from './config';
export * from './photoConstants';

import { Category, Tag } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', name: '家具', aliases: ['家具', '家具', 'furniture'], subcategories: [
    { id: 's1', name: '沙发', aliases: ['沙发', '沙发', 'sofa', 'couch'] },
    { id: 's2', name: '床', aliases: ['床', 'bed'] },
    { id: 's3', name: '桌子', aliases: ['桌子', '桌', 'table', 'desk'] },
  ]},
  { id: 'c2', name: '灯具', aliases: ['灯具', '灯具', 'lighting', 'lamp'], subcategories: [
    { id: 's4', name: '吊灯', aliases: ['吊灯', '吊灯', 'pendant'] },
    { id: 's5', name: '台灯', aliases: ['台灯', '台灯', 'table lamp'] },
  ]},
];

export const DEFAULT_TAGS: Tag[] = [];
