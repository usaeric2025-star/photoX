/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  Check, 
  Settings, 
  ChevronRight, 
  Share2, 
  Image as ImageIcon,
  Trash2,
  ChevronLeft,
  Filter,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Photo, Category, Tag, SubCategory } from './types';
import { analyzeProductPhoto } from './services/geminiService';
import { obfuscateKey, deobfuscateKey } from './utils/crypto';

// Default Data for initial setup
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', name: '家具', aliases: ['家具', '家俬', 'furniture'], subcategories: [
    { id: 's1', name: '沙發', aliases: ['沙发', '沙發', 'sofa', 'couch'] },
    { id: 's2', name: '床', aliases: ['床', 'bed'] },
    { id: 's3', name: '桌子', aliases: ['桌子', '桌', 'table', 'desk'] },
  ]},
  { id: 'c2', name: '燈具', aliases: ['灯具', '燈具', 'lighting', 'lamp'], subcategories: [
    { id: 's4', name: '吊燈', aliases: ['吊灯', '吊燈', 'pendant'] },
    { id: 's5', name: '台燈', aliases: ['台灯', '台燈', 'table lamp'] },
  ]},
];

const DEFAULT_TAGS: Tag[] = [
  { id: 't1', name: '新品', aliases: ['新品', 'new'] },
  { id: 't2', name: '熱銷', aliases: ['热销', '熱銷', 'popular', 'best seller'] },
  { id: 't3', name: '特價', aliases: ['特价', '特價', 'sale'] },
  { id: 't4', name: '木質', aliases: ['木質', 'wood'] },
];

// --- Utilities ---
const compressImage = (base64Str: string, maxWidth = 1280, maxHeight = 1280, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str); // Fallback to original if error
  });
};

// Simple IndexedDB Wrapper
const DB_NAME = 'ProductAlbumDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveData = async (key: string, data: any) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(data, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const loadData = async (key: string) => {
  const db = await initDB();
  return new Promise<any>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export default function App() {
  // --- State ---
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Navigation & UI State
  const [activeScreen, setActiveScreen] = useState<'home' | 'add' | 'manage' | 'settings'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [filterSubId, setFilterSubId] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  
  // Selection & Preview
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  // Add/Edit Photo State
  const [newPhotoData, setNewPhotoData] = useState<string | null>(null);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const [addCatId, setAddCatId] = useState<string | null>(null);
  const [addSubId, setAddSubId] = useState<string | null>(null);
  const [addTagIds, setAddTagIds] = useState<string[]>([]);
  const [addNote, setAddNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImportAnalyzing, setIsImportAnalyzing] = useState<{current: parseInt, total: parseInt} | null>(null);
  
  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);

  // Custom Prompt Dialog State
  const [promptDialog, setPromptDialog] = useState<{ title: string, placeholder: string, onSubmit: (val: string) => void } | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const quickAddCategory = () => {
    setPromptValue('');
    setPromptDialog({
      title: '新增主分類',
      placeholder: '輸入新主分類名稱',
      onSubmit: (val) => {
        const newCat = { id: 'cat_' + Date.now(), name: val.trim(), aliases: [], subcategories: [] };
        setCategories(prev => [...prev, newCat]);
        setAddCatId(newCat.id);
        setAddSubId(null);
      }
    });
  };

  const quickAddSubCategory = () => {
    if (!addCatId) return;
    setPromptValue('');
    setPromptDialog({
      title: '新增子分類',
      placeholder: '輸入新子分類名稱',
      onSubmit: (val) => {
        const newSubId = 'sub_' + Date.now();
        setCategories(prev => prev.map(c => c.id === addCatId ? {
          ...c,
          subcategories: [...c.subcategories, { id: newSubId, name: val.trim(), aliases: [] }]
        } : c));
        setAddSubId(newSubId);
      }
    });
  };

  const quickAddTag = () => {
    setPromptValue('');
    setPromptDialog({
      title: '自定義標籤',
      placeholder: '輸入新標籤名稱',
      onSubmit: (val) => {
        const newTagId = 'tag_' + Date.now();
        setTags(prev => [...prev, { id: newTagId, name: val.trim(), aliases: [] }]);
        setAddTagIds(prev => [...prev, newTagId]);
      }
    });
  };

  // Gemini API Key State
  const [geminiApiKey, setGeminiApiKey] = useState(deobfuscateKey(localStorage.getItem('gemini_api_key_safe') || '') || process.env.GEMINI_API_KEY || '');

  // --- Effects ---
  useEffect(() => {
    const boot = async () => {
      try {
        const savedPhotos = await loadData('product_photos');
        const savedCats = await loadData('product_categories');
        const savedTags = await loadData('product_tags');
        
        if (savedPhotos) setPhotos(savedPhotos);
        if (savedCats) setCategories(savedCats);
        if (savedTags) setTags(savedTags);
      } catch (e) {
        console.error('Failed to load from IndexedDB', e);
      } finally {
        setIsInitializing(false);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    const persist = async () => {
      await saveData('product_photos', photos);
      await saveData('product_categories', categories);
      await saveData('product_tags', tags);
    };
    persist();
  }, [photos, categories, tags, isInitializing]);

  // --- Derived Data ---
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      // Category filters
      if (filterCatId && p.categoryId !== filterCatId) return false;
      if (filterSubId && p.subcategoryId !== filterSubId) return false;
      
      // Tag filters (AND logic)
      if (filterTagIds.length > 0) {
        if (!filterTagIds.every(tid => p.tagIds.includes(tid))) return false;
      }
      
      // Text search (aliases matching)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cat = categories.find(c => c.id === p.categoryId);
        const sub = cat?.subcategories.find(s => s.id === p.subcategoryId);
        const pTags = tags.filter(t => p.tagIds.includes(t.id));
        
        const matchesCat = cat?.aliases.some(a => a.toLowerCase().includes(query));
        const matchesSub = sub?.aliases.some(a => a.toLowerCase().includes(query));
        const matchesTags = pTags.some(t => t.aliases.some(a => a.toLowerCase().includes(query)));
        const matchesNote = p.note.toLowerCase().includes(query);
        
        if (!matchesCat && !matchesSub && !matchesTags && !matchesNote) return false;
      }
      
      return true;
    });
  }, [photos, filterCatId, filterSubId, filterTagIds, searchQuery, categories, tags]);

  // --- Handlers ---
  const handlePhotoImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const useAi = !!geminiApiKey || !!process.env.GEMINI_API_KEY;
    if (useAi) setIsImportAnalyzing({ current: 1, total: files.length });
    
    let currentCats = [...categories];
    let currentTags = [...tags];
    let newPhotos: Photo[] = [];
    
    const fileArray = Array.from(files);
    
    for (let i = 0; i < fileArray.length; i++) {
      if (useAi) setIsImportAnalyzing({ current: i + 1, total: fileArray.length });
      const file = fileArray[i];
      const rawUri = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
      const compressedUri = await compressImage(rawUri);
      
      let finalCatId = null;
      let finalSubId = null;
      let finalTagIds: string[] = [];
      
      if (useAi) {
         try {
           const result = await analyzeProductPhoto(compressedUri, currentCats, currentTags, geminiApiKey);
           
           if (result.newCategoryName && !result.categoryId) {
              const newCat = { id: 'cat_' + Date.now() + Math.random().toString(36).substr(2, 5), name: result.newCategoryName, aliases: [], subcategories: [] };
              currentCats.push(newCat);
              finalCatId = newCat.id;
           } else {
              finalCatId = result.categoryId || null;
           }
           
           if (result.newSubCategoryName && !result.subcategoryId && finalCatId) {
              const catIndex = currentCats.findIndex(c => c.id === finalCatId);
              if (catIndex >= 0) {
                 const newSubId = 'sub_' + Date.now() + Math.random().toString(36).substr(2, 5);
                 currentCats[catIndex].subcategories.push({ id: newSubId, name: result.newSubCategoryName, aliases: [] });
                 finalSubId = newSubId;
              }
           } else {
              finalSubId = result.subcategoryId || null;
           }
           
           finalTagIds = result.tagIds || [];
           if (result.newTagName) {
               const newTagId = 'tag_' + Date.now() + Math.random().toString(36).substr(2, 5);
               currentTags.push({ id: newTagId, name: result.newTagName, aliases: [] });
               finalTagIds.push(newTagId);
           }
           
         } catch (err) {
             console.error("AI Analysis failed for a photo", err);
         }
      }

      newPhotos.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        uri: compressedUri,
        categoryId: finalCatId,
        subcategoryId: finalSubId,
        tagIds: finalTagIds,
        note: '',
        createdAt: new Date().toISOString()
      });
    }
    
    setCategories(currentCats);
    setTags(currentTags);
    setPhotos(prev => [...newPhotos, ...prev]);
    if (useAi) setIsImportAnalyzing(null);
    setActiveScreen('home');
  };

  const saveNewPhoto = async () => {
    if (!newPhotoData || !addCatId) return;
    
    const compressedData = await compressImage(newPhotoData);
    
    if (editPhotoId) {
      setPhotos(prev => prev.map(p => p.id === editPhotoId ? {
        ...p,
        uri: compressedData,
        categoryId: addCatId,
        subcategoryId: addSubId,
        tagIds: addTagIds,
        note: addNote
      } : p));
      setEditPhotoId(null);
    } else {
      const newPhoto: Photo = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        uri: compressedData,
        categoryId: addCatId,
        subcategoryId: addSubId,
        tagIds: addTagIds,
        note: addNote,
        createdAt: new Date().toISOString()
      };
      setPhotos([newPhoto, ...photos]);
    }
    resetAddState();
    setActiveScreen('home');
  };

  const resetAddState = () => {
    setNewPhotoData(null);
    setEditPhotoId(null);
    setBatchEditIds(null);
    setAddCatId(null);
    setAddSubId(null);
    setAddTagIds([]);
    setAddNote('');
  };

  const saveBatchEdit = () => {
    if (!batchEditIds || !addCatId) return;
    setPhotos(prev => prev.map(p => batchEditIds.includes(p.id) ? {
      ...p,
      categoryId: addCatId!,
      subcategoryId: addSubId,
      tagIds: addTagIds
    } : p));
    resetAddState();
    setIsMultiSelect(false);
    setSelectedIds([]);
  };

  const togglePhotoSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleShare = async () => {
    if (selectedIds.length === 0) return;
    try {
      if (navigator.share) {
        // Prepare files for sharing from base64 data URIs
        const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));
        const shareFiles = await Promise.all(
          selectedPhotos.map(async (photo, index) => {
            const res = await fetch(photo.uri);
            const blob = await res.blob();
            // Assign a reliable filename with jpg extension since we compressed as image/jpeg
            return new File([blob], `product_${index + 1}.jpg`, { type: 'image/jpeg' });
          })
        );

        if (navigator.canShare && navigator.canShare({ files: shareFiles })) {
          await navigator.share({
            title: '產品照片分享',
            files: shareFiles
          });
        } else {
          // Fallback if the device doesn't support file sharing
          await navigator.share({
            title: '分享產品照片',
            text: `(您的裝置不支援直接分享圖片) 這裡有 ${selectedIds.length} 張產品照片`
          });
        }
      } else {
        alert('您的瀏覽器不支援原生分享。');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleLongPressStart = (uri: string) => {
    if (isMultiSelect) return;
    pressTimer.current = setTimeout(() => {
      setPreviewUri(uri);
    }, 300);
  };

  const handleLongPressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setPreviewUri(null);
  };

  const deleteSelected = () => {
    setConfirmDialog({
      message: `確定要刪除這 ${selectedIds.length} 張照片嗎？`,
      onConfirm: () => {
        setPhotos(prev => prev.filter(p => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        setIsMultiSelect(false);
      }
    });
  };

  // --- UI Components ---
  const MainHeader = () => (
    <header className="sticky top-0 z-30 bg-white/40 backdrop-blur-md border-b border-white/50 px-6 pt-10 pb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">產品相冊</h1>
        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">已匯入 {photos.length} 張照片</p>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {
            setIsMultiSelect(!isMultiSelect);
            if (isMultiSelect) setSelectedIds([]);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${isMultiSelect ? 'bg-blue-500 border-blue-500 text-white shadow-lg' : 'bg-white/60 border-white/50 text-slate-600'}`}
        >
          {isMultiSelect ? '取消選擇' : '選擇'}
        </button>
        <button 
          onClick={() => setActiveScreen('manage')}
          className="w-10 h-10 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center border border-white shadow-sm text-slate-500 transition-all active:scale-90"
        >
          <Settings size={20} />
        </button>
        <label className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-white shadow-md text-slate-800 transition-all active:scale-90 cursor-pointer">
          <Plus size={24} />
          <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoImport} />
        </label>
      </div>
    </header>
  );

  const SearchAndFilter = () => (
    <div className="bg-transparent px-6 py-4 space-y-4 sticky top-[97px] z-20">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="搜尋產品、分類或標籤..."
          className="w-full bg-white/50 border border-white/50 rounded-2xl py-3 pl-11 pr-4 text-sm focus:bg-white/80 transition-all outline-none text-slate-800 placeholder-slate-400 border border-white/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none no-scrollbar">
        <button 
          onClick={() => { setFilterCatId(null); setFilterSubId(null); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${!filterCatId ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white/60 border-white/40 text-slate-700'}`}
        >
          全部
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => { setFilterCatId(cat.id); setFilterSubId(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${filterCatId === cat.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white/60 border-white/40 text-slate-700'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {filterCatId && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex overflow-x-auto pb-1 gap-2 no-scrollbar"
          >
            <button 
              onClick={() => setFilterSubId(null)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${!filterSubId ? 'bg-slate-600 border-slate-600 text-white' : 'bg-white/40 border-white/20 text-slate-500'}`}
            >
              全部子類
            </button>
            {categories.find(c => c.id === filterCatId)?.subcategories.map(sub => (
              <button 
                key={sub.id}
                onClick={() => setFilterSubId(sub.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${filterSubId === sub.id ? 'bg-slate-600 border-slate-600 text-white' : 'bg-white/40 border-white/20 text-slate-500'}`}
              >
                {sub.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
        {tags.map(tag => (
          <button 
            key={tag.id}
            onClick={() => setFilterTagIds(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-all border ${filterTagIds.includes(tag.id) ? 'bg-blue-500/80 border-blue-500 text-white shadow-sm' : 'bg-slate-100/50 border-slate-200/50 text-slate-600'}`}
          >
            #{tag.name}
          </button>
        ))}
      </div>
    </div>
  );

  const HomeView = () => (
    <div className="flex flex-col min-h-screen bg-transparent pb-32">
      <MainHeader />
      <SearchAndFilter />
      
      <div className="px-6 py-2">
        <div className="grid grid-cols-3 gap-3">
          {filteredPhotos.map((photo) => (
            <motion.div 
              layout
              key={photo.id}
              className={`relative aspect-square rounded-2xl overflow-hidden group shadow-sm active:scale-95 transition-all ring-offset-2 ${selectedIds.includes(photo.id) ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => {
                if (isMultiSelect) {
                  togglePhotoSelection(photo.id);
                } else {
                  setPreviewUri(photo.uri);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setEditPhotoId(photo.id);
                setAddCatId(photo.categoryId);
                setAddSubId(photo.subcategoryId);
                setAddTagIds(photo.tagIds);
                setAddNote(photo.note);
                setNewPhotoData(photo.uri);
              }}
            >
              <img 
                src={photo.uri} 
                className={`w-full h-full object-cover transition-all duration-300 ${selectedIds.includes(photo.id) ? 'scale-110 opacity-70' : 'group-hover:scale-105'}`}
                alt="Product"
              />
              
              {isMultiSelect && (
                <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all ${selectedIds.includes(photo.id) ? 'bg-blue-500 text-white' : 'bg-white/60 backdrop-blur-sm border border-white/50'}`}>
                  {selectedIds.includes(photo.id) && <Check size={12} strokeWidth={4} />}
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 translate-y-1 group-hover:translate-y-0 transition-transform">
                <p className="text-[9px] text-white/90 font-bold tracking-wider truncate uppercase">
                  {categories.find(c => c.id === photo.categoryId)?.name}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {filteredPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white/50 shadow-sm">
              <ImageIcon size={32} className="opacity-40" />
            </div>
            <p className="text-xs font-medium">找不到符合條件的照片</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isMultiSelect && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-10 left-10 right-10 z-40 bg-white/80 backdrop-blur-xl rounded-[32px] p-4 flex flex-col gap-3 shadow-2xl border border-white/50"
          >
            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col">
                <span className={`text-xs font-bold transition-colors ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                  {selectedIds.length > 0 ? `已選取 ${selectedIds.length} 張照片` : `請點選照片`}
                </span>
                <div className="flex gap-2 mt-1">
                  <button 
                    onClick={() => {
                      if (selectedIds.length === filteredPhotos.length) {
                        setSelectedIds([]);
                      } else {
                        setSelectedIds(filteredPhotos.map(p => p.id));
                      }
                    }}
                    className="text-[10px] text-blue-500 font-bold hover:text-blue-700"
                  >
                    {selectedIds.length === filteredPhotos.length ? '取消全選' : '全選'}
                  </button>
                  <span className="text-[10px] text-slate-300">|</span>
                  <button 
                    onClick={() => { setIsMultiSelect(false); setSelectedIds([]); }}
                    className="text-[10px] text-slate-400 font-medium hover:text-slate-600"
                  >
                    結束選擇
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    setBatchEditIds(selectedIds);
                    setAddCatId(null);
                    setAddSubId(null);
                    setAddTagIds([]);
                  }}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group-active:scale-90 transition-transform">
                     <Settings2 size={18} />
                   </div>
                   <span className="text-[9px] mt-1 text-indigo-600 font-bold">批量分類</span>
                </button>
                <button 
                  disabled={selectedIds.length === 0}
                  onClick={handleShare}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-active:scale-90 transition-transform">
                     <Share2 size={18} />
                   </div>
                   <span className="text-[9px] mt-1 text-blue-600 font-bold">分享</span>
                </button>

                {selectedIds.length > 0 && (
                  <button 
                    onClick={deleteSelected}
                    className="flex flex-col items-center group text-red-500"
                  >
                     <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center shadow-sm group-active:scale-90 transition-transform">
                       <Trash2 size={18} />
                     </div>
                     <span className="text-[9px] mt-1 font-bold">刪除</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const BatchEditScreen = () => (
    <div className="absolute inset-0 z-[60] bg-white/60 backdrop-blur-xl flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-white/50 flex items-center justify-between">
        <button onClick={resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <X size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800">批量修改 ({batchEditIds?.length} 張)</h2>
        <button 
          onClick={saveBatchEdit}
          disabled={!addCatId}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg disabled:opacity-30 disabled:shadow-none transition-all active:scale-95"
        >
          套用
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-20">
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-2">
          <p className="text-[11px] text-blue-600 font-bold leading-relaxed">
            注意：這將會同時更新所有選中照片的分類與標籤。備註欄位將保留原樣不進行批量覆蓋。
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">目標主分類 *</h3>
            <button onClick={quickAddCategory} className="text-[10px] text-blue-500 font-bold flex items-center gap-1 active:scale-95 transition-transform"><Plus size={12}/> 新增</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => { setAddCatId(cat.id); setAddSubId(null); }}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${addCatId === cat.id ? 'bg-white/80 border-blue-500 text-blue-600 shadow-md' : 'bg-white/40 border-white/50 text-slate-500 hover:bg-white/60'}`}
              >
                <span className="font-bold block text-sm">{cat.name}</span>
                <span className="text-[9px] uppercase tracking-tighter opacity-60">Category</span>
              </button>
            ))}
          </div>
        </section>

        <AnimatePresence>
          {addCatId && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">目標子分類</h3>
                <button onClick={quickAddSubCategory} className="text-[10px] text-blue-500 font-bold flex items-center gap-1 active:scale-95 transition-transform"><Plus size={12}/> 新增</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.find(c => c.id === addCatId)?.subcategories.map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => setAddSubId(sub.id)}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${addSubId === sub.id ? 'bg-slate-700 border-slate-700 text-white shadow-lg' : 'bg-white/40 border-white/50 text-slate-500 hover:bg-white/60'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">統一標籤</h3>
            <button onClick={quickAddTag} className="text-[10px] text-blue-500 font-bold flex items-center gap-1 active:scale-95 transition-transform"><Plus size={12}/> 新增</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => setAddTagIds(prev => prev.includes(tag.id) ? prev.filter(tid => tid !== tag.id) : [...prev, tag.id])}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${addTagIds.includes(tag.id) ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white/40 border-white/50 text-slate-500 hover:bg-white/60'}`}
              >
                #{tag.name}
              </button>
            ))}
            <button onClick={quickAddTag} className="px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-1 font-semibold hover:border-slate-400 hover:text-slate-500 transition-colors">
              <Plus size={14} /> 自定義
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  const AddPhotoScreen = () => (
    <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-xl flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-white/50 flex items-center justify-between">
        <button onClick={() => { resetAddState(); setActiveScreen('home'); }} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <X size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800">{editPhotoId ? '編輯產品資訊' : '分類產品照片'}</h2>
        <button 
          onClick={saveNewPhoto}
          disabled={!addCatId}
          className="bg-slate-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg disabled:opacity-30 disabled:shadow-none transition-all active:scale-95"
        >
          儲存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-20">
        <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center border border-white/20">
          {newPhotoData && <img src={newPhotoData} className="max-w-full max-h-full object-contain" alt="New" />}
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">主分類 *</h3>
            <button onClick={quickAddCategory} className="text-[10px] text-blue-500 font-bold flex items-center gap-1 active:scale-95 transition-transform"><Plus size={12}/> 新增</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => { setAddCatId(cat.id); setAddSubId(null); }}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${addCatId === cat.id ? 'bg-white/80 border-slate-800 text-slate-800 shadow-md' : 'bg-white/40 border-white/50 text-slate-500 hover:bg-white/60'}`}
              >
                <span className="font-bold block text-sm">{cat.name}</span>
                <span className="text-[9px] uppercase tracking-tighter opacity-60">Category</span>
              </button>
            ))}
          </div>
        </section>

        <AnimatePresence>
          {addCatId && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">子分類</h3>
                <button onClick={quickAddSubCategory} className="text-[10px] text-blue-500 font-bold flex items-center gap-1 active:scale-95 transition-transform"><Plus size={12}/> 新增</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.find(c => c.id === addCatId)?.subcategories.map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => setAddSubId(sub.id)}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${addSubId === sub.id ? 'bg-slate-700 border-slate-700 text-white shadow-lg' : 'bg-white/40 border-white/50 text-slate-500 hover:bg-white/60'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">標籤</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => setAddTagIds(prev => prev.includes(tag.id) ? prev.filter(tid => tid !== tag.id) : [...prev, tag.id])}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${addTagIds.includes(tag.id) ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white/40 border-white/50 text-slate-500 hover:bg-white/60'}`}
              >
                #{tag.name}
              </button>
            ))}
            <button onClick={quickAddTag} className="px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-1 font-semibold hover:border-slate-400 hover:text-slate-500 transition-colors">
              <Plus size={14} /> 自定義
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">備註</h3>
            <button 
              onClick={async () => {
                if (!newPhotoData) return;
                setIsAnalyzing(true);
                try {
                  const result = await analyzeProductPhoto(newPhotoData, categories, tags, geminiApiKey);
                  // Update logic for AI generating new categories
                  if (result.newCategoryName && !result.categoryId) {
                     const newCat = { id: 'cat_' + Date.now(), name: result.newCategoryName, aliases: [], subcategories: [] };
                     setCategories(prev => [...prev, newCat]);
                     setAddCatId(newCat.id);
                  } else if (result.categoryId) {
                     setAddCatId(result.categoryId);
                  }
                  
                  if (result.newSubCategoryName && !result.subcategoryId) {
                     const subIdToUse = result.categoryId || addCatId;
                     if (subIdToUse) {
                       const newSubId = 'sub_' + Date.now();
                       setCategories(prev => prev.map(c => c.id === subIdToUse ? {
                         ...c,
                         subcategories: [...c.subcategories, { id: newSubId, name: result.newSubCategoryName, aliases: [] }]
                       } : c));
                       setAddSubId(newSubId);
                     }
                  } else if (result.subcategoryId) {
                     setAddSubId(result.subcategoryId);
                  }
                  
                  let newTagId = null;
                  if (result.newTagName) {
                     newTagId = 'tag_' + Date.now();
                     setTags(prev => [...prev, { id: newTagId, name: result.newTagName, aliases: []}]);
                  }
                  
                  if ((result.tagIds && result.tagIds.length > 0) || newTagId) {
                    setAddTagIds(prev => {
                      const all = new Set([...prev, ...(result.tagIds || [])]);
                      if (newTagId) all.add(newTagId);
                      return Array.from(all);
                    });
                  }
                } catch (e: any) {
                  alert(e.message);
                } finally {
                  setIsAnalyzing(false);
                }
              }}
              disabled={isAnalyzing || (!geminiApiKey && !process.env.GEMINI_API_KEY)}
              className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg text-white text-[10px] font-bold shadow-md shadow-purple-500/30 flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {isAnalyzing ? (
                <span className="animate-pulse">辨識中...</span>
              ) : (
                <>✨ AI 智能辨識與撰寫</>
              )}
            </button>
          </div>
          <textarea 
            placeholder="輸入產品特色或注意事項..."
            className="w-full rounded-2xl border border-white/50 p-4 text-sm bg-white/50 shadow-inner focus:bg-white/80 transition-all outline-none text-slate-800 placeholder-slate-400"
            rows={4}
            value={addNote}
            onChange={(e) => setAddNote(e.target.value)}
          />
        </section>
      </div>
    </div>
  );

  const deleteCategory = (id: string) => {
    setConfirmDialog({
      message: '確定要刪除此分類嗎？相關照片的分類將會被清空。',
      onConfirm: () => {
        setCategories(prev => prev.filter(c => c.id !== id));
        setPhotos(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: null, subcategoryId: null } : p));
      }
    });
  };

  const deleteSubCategory = (catId: string, subId: string) => {
    setConfirmDialog({
      message: '確定要刪除此子分類嗎？',
      onConfirm: () => {
        setCategories(prev => prev.map(c => c.id === catId ? {
          ...c,
          subcategories: c.subcategories.filter(s => s.id !== subId)
        } : c));
        setPhotos(prev => prev.map(p => p.subcategoryId === subId ? { ...p, subcategoryId: null } : p));
      }
    });
  };

  const deleteTag = (id: string) => {
    setConfirmDialog({
      message: '確定要刪除此標籤嗎？',
      onConfirm: () => {
        setTags(prev => prev.filter(t => t.id !== id));
        setPhotos(prev => prev.map(p => ({
          ...p,
          tagIds: p.tagIds.filter(tid => tid !== id)
        })));
      }
    });
  };

  const ManageScreen = () => {
    const [newCatName, setNewCatName] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const [newSubName, setNewSubName] = useState('');

    const addCategory = () => {
      if (!newCatName.trim()) return;
      const newCat: Category = {
        id: 'c' + Date.now(),
        name: newCatName.trim(),
        aliases: [newCatName.trim()],
        subcategories: []
      };
      setCategories([...categories, newCat]);
      setNewCatName('');
    };

    const addSubCategory = (catId: string) => {
      if (!newSubName.trim()) return;
      setCategories(prev => prev.map(c => c.id === catId ? {
        ...c,
        subcategories: [...c.subcategories, {
          id: 's' + Date.now(),
          name: newSubName.trim(),
          aliases: [newSubName.trim()]
        }]
      } : c));
      setNewSubName('');
    };

    const addTag = () => {
      if (!newTagName.trim()) return;
      const newTag: Tag = {
        id: 't' + Date.now(),
        name: newTagName.trim(),
        aliases: [newTagName.trim()]
      };
      setTags([...tags, newTag]);
      setNewTagName('');
    };

    return (
      <div className="absolute inset-0 z-50 bg-slate-50/80 backdrop-blur-xl flex flex-col pt-safe">
        <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3 bg-white/40">
          <button onClick={() => setActiveScreen('home')} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="font-bold text-lg text-slate-800 flex-1 ml-1">目錄與標籤管理</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
          {/* Categories Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                主分類管理
              </h3>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="輸入新分類名稱..."
                className="flex-1 bg-white/60 border border-white p-3 rounded-xl text-sm outline-none focus:bg-white transition-all shadow-sm"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              />
              <button 
                onClick={addCategory}
                className="bg-slate-800 text-white px-4 rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white/40 border border-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 flex items-center justify-between">
                    <button 
                      onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                      className="flex-1 text-left flex items-center gap-2 group"
                    >
                      <ChevronRight 
                        size={18} 
                        className={`text-slate-400 transition-transform ${expandedCat === cat.id ? 'rotate-90 text-blue-500' : ''}`} 
                      />
                      <span className="font-bold text-slate-700">{cat.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({cat.subcategories.length})</span>
                    </button>
                    <button 
                      onClick={() => deleteCategory(cat.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {expandedCat === cat.id && (
                    <motion.div 
                      initial={{ height: 0 }} 
                      animate={{ height: 'auto' }}
                      className="bg-slate-50/50 border-t border-white px-4 py-3 space-y-3"
                    >
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="新增子分類..."
                          className="flex-1 bg-white border border-slate-100 p-2 rounded-lg text-xs outline-none"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addSubCategory(cat.id)}
                        />
                        <button 
                          onClick={() => addSubCategory(cat.id)}
                          className="px-3 bg-blue-500 text-white rounded-lg text-xs font-bold"
                        >
                          添加
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cat.subcategories.map(sub => (
                          <div key={sub.id} className="bg-white border border-slate-200 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
                            <span className="text-xs font-medium text-slate-600">{sub.name}</span>
                            <button onClick={() => deleteSubCategory(cat.id, sub.id)} className="text-slate-300 hover:text-red-500">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Tags Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-purple-500 rounded-full"></div>
              標籤管理
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="輸入新標籤..."
                className="flex-1 bg-white/60 border border-white p-3 rounded-xl text-sm outline-none focus:bg-white transition-all shadow-sm"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
              />
              <button 
                onClick={addTag}
                className="bg-slate-800 text-white px-4 rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 bg-white/40 p-4 rounded-2xl border border-white shadow-inner min-h-[100px] align-top">
              {tags.map(tag => (
                <div key={tag.id} className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2 shadow-sm group">
                  <span className="text-xs font-bold text-slate-600">#{tag.name}</span>
                  <button onClick={() => deleteTag(tag.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Advanced Settings */}
          <section className="pt-4">
             <button 
              onClick={() => setActiveScreen('settings')}
              className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm active:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                  <Settings size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-slate-800">其他設定</p>
                  <p className="text-[10px] text-slate-400 font-medium">AI 智能辨識金鑰、數據備份與還原</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
            </button>
          </section>
        </div>
      </div>
    );
  };

  const SettingsScreen = () => (
    <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-xl flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3">
        <button onClick={() => setActiveScreen('manage')} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800 flex-1 ml-1">其他設定</h2>
      </div>

      <div className="p-6">
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 space-y-4 mb-4">
          <h4 className="font-bold text-slate-800 text-sm">✨ AI 功能設定</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            設定您的 Google Gemini API Key 以啟用「智能辨識」功能。自動分類與文案撰寫功能需要此金鑰。
          </p>
          <input 
            type="password" 
            placeholder="填寫 Gemini API Key..."
            className="w-full rounded-xl border border-white/50 p-3 text-xs bg-white/50 shadow-inner focus:bg-white/80 transition-all outline-none text-slate-800"
            value={geminiApiKey}
            onChange={(e) => {
              setGeminiApiKey(e.target.value);
              localStorage.setItem('gemini_api_key_safe', obfuscateKey(e.target.value));
            }}
          />
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 space-y-4">
          <h4 className="font-bold text-slate-800 text-sm">數據管理</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            您的產品目錄（包含分類、標籤與相片紀錄）均儲存在手機本機。建議定期匯出備份，避免數據意外遺失。
          </p>
          
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => {
                const data = JSON.stringify({ photos, categories, tags });
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'product_album_backup.json';
                a.click();
              }}
              className="flex-1 bg-slate-800 text-white py-3 rounded-2xl text-xs font-bold shadow-lg"
            >
              匯出完整備份 (JSON)
            </button>
            <label className="flex-1 bg-white text-slate-800 text-center py-3 rounded-2xl text-xs font-bold border border-slate-200 cursor-pointer shadow-sm">
              <input 
                type="file" 
                className="hidden" 
                accept="application/json" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const json = JSON.parse(event.target?.result as string);
                      if (json.photos) setPhotos(json.photos);
                      if (json.categories) setCategories(json.categories);
                      if (json.tags) setTags(json.tags);
                      alert('數據匯入成功！');
                    } catch (e) {
                      alert('檔案格式錯誤');
                    }
                  };
                  reader.readAsText(file);
                }}
              />
              匯入備份
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full min-h-screen bg-transparent p-4 font-sans select-none flex items-center justify-center relative overflow-hidden">
      <div className="frosted-bg">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>

      <div className="w-full max-w-[420px] h-[85vh] bg-white/40 backdrop-blur-2xl rounded-[48px] border border-white/50 shadow-2xl overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          {activeScreen === 'home' && <HomeView />}
          {(activeScreen === 'add' || editPhotoId) && <AddPhotoScreen />}
          {batchEditIds && <BatchEditScreen />}
          {activeScreen === 'manage' && <ManageScreen />}
          {activeScreen === 'settings' && <SettingsScreen />}
        </div>
      </div>

      {/* Full-screen preview on long press */}
      <AnimatePresence>
        {previewUri && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-8"
            onClick={() => setPreviewUri(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-[320px] bg-white rounded-[32px] p-2 shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={previewUri} 
                className="w-full aspect-square rounded-[24px] object-cover mb-3"
                alt="Peek preview"
              />
              <div className="px-3 pb-3">
                <h3 className="font-bold text-slate-800 text-base mb-1">產品預覽</h3>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-white rounded-[24px] p-5 shadow-2xl overflow-hidden relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-2">確認操作</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20 transition-colors"
                >
                  確認刪除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Prompt Dialog */}
      <AnimatePresence>
        {promptDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setPromptDialog(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-white rounded-[24px] p-5 shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-slate-800 text-base mb-4 text-center">{promptDialog.title}</h3>
              <input 
                type="text"
                autoFocus
                placeholder={promptDialog.placeholder}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none text-slate-800 placeholder-slate-400 mb-6"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && promptValue.trim()) {
                    promptDialog.onSubmit(promptValue);
                    setPromptDialog(null);
                  }
                }}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setPromptDialog(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    if (promptValue.trim()) {
                      promptDialog.onSubmit(promptValue);
                      setPromptDialog(null);
                    }
                  }}
                  disabled={!promptValue.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  確認
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Global Safe Area Inset styles */}
      <style>{`
        .pt-safe { padding-top: env(safe-area-inset-top, 0px); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* Import Analyzing Overlay */}
      <AnimatePresence>
        {isImportAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-8"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-6 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 animate-pulse"></div>
               <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin"></div>
            </div>
            <h3 className="text-white font-bold text-lg mb-2 text-center drop-shadow-md">✨ AI 正在為您智慧分類</h3>
            <p className="text-white/80 text-sm font-medium text-center">
              分析中... 照片 {isImportAnalyzing.current} / {isImportAnalyzing.total}
            </p>
            <div className="w-full max-w-[200px] h-2 bg-white/20 rounded-full mt-6 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${(isImportAnalyzing.current / isImportAnalyzing.total) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
