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
  Settings2,
  Layers,
  Sparkles,
  Minimize2,
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCcw,
  Edit3,
  CloudUpload,
  CloudDownload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeProductPhoto } from './services/geminiService';
import { obfuscateKey, deobfuscateKey } from './utils/crypto';
import { 
  onAuthChange, 
  loginWithGoogle, 
  logout, 
  loadPhotosFromCloud, 
  loadAllPhotosFromCloud,
  savePhotoToCloud,
  deletePhotoFromCloud,
  syncPhotosToCloud,
  calculateMD5,
  generateItemCode,
  checkImageHashExists,
  uploadImage,
  compressImage,
  loadCategoriesFromCloud
} from './services/supabaseService';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { PublicGallery } from './components/PublicGallery';
import { Photo, Category, Tag, SubCategory, DB_Category } from './types';

interface User extends SupabaseUser {
  displayName?: string;
  avatarUrl?: string;
}

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

// --- Photo Card Component (Memoized for Performance) ---
interface PhotoCardProps {
  photo: Photo;
  isMultiSelect: boolean;
  isSelected: boolean;
  isGroupMaster: boolean;
  groupCount: number;
  categoryName: string | undefined;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const PhotoCard = React.memo(({ 
  photo, 
  isMultiSelect, 
  isSelected, 
  isGroupMaster, 
  groupCount, 
  categoryName, 
  onClick, 
  onContextMenu 
}: PhotoCardProps) => {
  return (
    <motion.div 
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`relative aspect-square rounded-2xl overflow-hidden group shadow-sm active:scale-95 transition-all ring-offset-2 will-change-transform ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <img 
        src={photo.uri} 
        loading="lazy"
        className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110 opacity-70' : 'group-hover:scale-105'}`}
        alt="Product"
      />
      
      {photo.groupId && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-[4px] text-[7px] text-white font-bold tracking-tighter flex items-center gap-1 border border-white/20">
          <Layers size={8} />
          {photo.groupId}
        </div>
      )}

      {isGroupMaster && groupCount > 1 && (
        <div className="absolute top-2 right-2 bg-blue-500 px-1.5 py-0.5 rounded-[4px] text-[7px] text-white font-bold shadow-lg ring-1 ring-white/30">
          {groupCount}
        </div>
      )}

      {isMultiSelect && !isGroupMaster && (
        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/60 backdrop-blur-sm border border-white/50'}`}>
          {isSelected && <Check size={12} strokeWidth={4} />}
        </div>
      )}
      
      {photo.isAnalyzing && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col justify-center items-center cursor-default"
        >
          <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin mb-1"></div>
          <span className="text-[8px] text-white font-bold tracking-wider">AI</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 translate-y-1 group-hover:translate-y-0 transition-transform">
        <p className="text-[9px] text-white/90 font-bold tracking-wider truncate uppercase mb-0.5">
          {categoryName}
        </p>
        {/* Removed item_code and manual_code for a cleaner look as requested */}
      </div>
    </motion.div>
  );
});

export default function App() {
  // --- State ---
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [dbCategories, setDbCategories] = useState<DB_Category[]>([]);
  const [appLang, setAppLang] = useState<'zh' | 'en' | 'ms'>('zh');
  const [publicPhotos, setPublicPhotos] = useState<Photo[]>([]);
  const [viewMode, setViewMode] = useState<'public' | 'private'>('public');
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAction, setSyncAction] = useState<'push' | 'pull' | 'idle'>('idle');
  const [syncPercent, setSyncPercent] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
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
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [isUnifiedEditing, setIsUnifiedEditing] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const cancelBatchAiRef = useRef(false);

  // Add/Edit Photo State
  const [newPhotoData, setNewPhotoData] = useState<string | null>(null);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const [addCatId, setAddCatId] = useState<string | null>(null);
  const [addSubId, setAddSubId] = useState<string | null>(null);
  const [addTagIds, setAddTagIds] = useState<string[]>([]);
  const [addNote, setAddNote] = useState('');
  const [addManualCode, setAddManualCode] = useState('');
  const [addDimL, setAddDimL] = useState<string>('');
  const [addDimW, setAddDimW] = useState<string>('');
  const [addDimH, setAddDimH] = useState<string>('');
  const [showOtherFields, setShowOtherFields] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);
  
  // Custom Alert Dialog State (for replacing native alerts on mobile)
  const [alertDialog, setAlertDialog] = useState<{ title: string, message: string } | null>(null);

  // Custom Prompt Dialog State
  const [promptDialog, setPromptDialog] = useState<{ title: string, placeholder: string, onSubmit: (val: string) => void } | null>(null);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    loadCategoriesFromCloud().then(setDbCategories);
  }, []);

  // Stuck Analysis Safety Net
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setPhotos(prev => {
        let changed = false;
        const next = prev.map(p => {
          if (p.isAnalyzing && p.createdAt) {
             const created = new Date(p.createdAt).getTime();
             if (now - created > 60000) { // 60 seconds threshold
                changed = true;
                return { ...p, isAnalyzing: false };
             }
          }
          return p;
        });
        return changed ? next : prev;
      });
    }, 10000); // Check every 10 seconds
    return () => clearInterval(timer);
  }, []);

  // Manage Screen Internal States (Moved here to stabilize component)
  const [newCatName, setNewCatName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const quickAddCategory = () => {
    setPromptValue('');
    setPromptDialog({
      title: '新增主分類',
      placeholder: '輸入新主分類名稱',
      onSubmit: (val) => {
        const newCat = { id: crypto.randomUUID(), name: val.trim(), aliases: [], subcategories: [] };
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
        const newSubId = crypto.randomUUID();
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
        const newTagId = crypto.randomUUID();
        setTags(prev => [...prev, { id: newTagId, name: val.trim(), aliases: [] }]);
        setAddTagIds(prev => [...prev, newTagId]);
      }
    });
  };

  // Gemini API Key State
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('ai_provider') || 'auto');
  const [geminiApiKey, setGeminiApiKey] = useState(deobfuscateKey(localStorage.getItem('gemini_api_key_safe') || '') || process.env.GEMINI_API_KEY || '');
  
  // Cleanup deprecated models stored in user config
  const initialCustomModel = localStorage.getItem('ai_custom_model') || '';
  const [customModel, setCustomModel] = useState(() => {
    if (initialCustomModel === 'llama-3.2-11b-vision-preview' || initialCustomModel === 'llama-3.2-90b-vision-preview') {
      localStorage.removeItem('ai_custom_model');
      return '';
    }
    return initialCustomModel;
  });

  // Refs for background workers
  const catsRef = useRef(categories);
  const tagsRef = useRef(tags);
  const photosRef = useRef(photos);

  useEffect(() => {
    catsRef.current = categories;
    tagsRef.current = tags;
    photosRef.current = photos;
  }, [categories, tags, photos]);

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        setViewMode('private');
      } else {
        setViewMode('public');
      }
      
      // Always load from local on start to prevent overwriting recent offline changes
      // or bringing back deleted items unexpectedly. Let user manually pull from cloud.
      try {
        const savedPhotos = await loadData('product_photos');
        const savedCats = await loadData('product_categories');
        const savedTags = await loadData('product_tags');
        const savedSyncTime = await loadData('last_sync_time');
        
        let finalPhotos = savedPhotos;
        if ((!savedPhotos || savedPhotos.length === 0) && u) {
          try {
            const cloudPhotos = await loadPhotosFromCloud(u.id);
            if (cloudPhotos && cloudPhotos.length > 0) {
              finalPhotos = cloudPhotos;
              const now = Date.now();
              setLastSyncTime(now);
              await saveData('last_sync_time', now);
              await saveData('product_photos', cloudPhotos);
            }
          } catch(err) {
            console.error("Auto pull failed", err);
          }
        }

        if (finalPhotos && finalPhotos.length > 0) setPhotos(finalPhotos);
        if (savedCats && savedCats.length > 0) setCategories(savedCats);
        if (savedTags && savedTags.length > 0) setTags(savedTags);
        if (savedSyncTime && (!finalPhotos || finalPhotos === savedPhotos)) {
           setLastSyncTime(savedSyncTime);
        }
      } catch (e) {
        console.error("Data load failed:", e);
      } finally {
        setIsInitializing(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (viewMode === 'public') {
      const fetchPublic = async () => {
        try {
          const publicData = await loadAllPhotosFromCloud();
          setPublicPhotos(publicData);
        } catch(e) {
          console.error("Public load err:", e);
        }
      };
      fetchPublic();
    }
  }, [viewMode]);

  useEffect(() => {
    if (activeScreen === 'settings' && user) {
      loadPhotosFromCloud(user.id)
        .then(data => setCloudCount(data ? data.length : 0))
        .catch(err => console.error("Failed to fetch cloud count", err));
    }
  }, [activeScreen, user]);

  useEffect(() => {
    if (isInitializing) return;
    const persist = async () => {
      // Local Backup
      await saveData('product_photos', photos);
      await saveData('product_categories', categories);
      await saveData('product_tags', tags);
    };
    persist();
  }, [photos, categories, tags, isInitializing, user]);

  // Specific save/delete handlers for cloud performance
  const syncItemToCloud = async (photo: Photo) => {
    if (user) {
      await savePhotoToCloud(user.id, photo);
    }
  };

  const removeItemFromCloud = async (photo: Photo) => {
    if (user) {
      await deletePhotoFromCloud(user.id, photo);
    }
  };

  // --- Derived Data ---
  const activePhotosSource = viewMode === 'public' ? publicPhotos : photos;

  const filteredPhotos = useMemo(() => {
    return activePhotosSource.filter(p => {
      if (viewMode === 'private') {
        if (filterCatId) {
          // Check both code (new) and id (legacy) for robustness
          if (p.category !== filterCatId && p.categoryId !== filterCatId) return false;
        }
        if (filterSubId && p.subcategoryId !== filterSubId) return false;
        
        if (filterTagIds.length > 0) {
          if (!filterTagIds.every(tid => (p.tagIds || []).includes(tid))) return false;
        }
      }
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        
        if (viewMode === 'private') {
          const dbCat = dbCategories.find(c => c.code === p.category);
          const legacyCat = categories.find(c => c.id === p.categoryId);
          const sub = (dbCat || legacyCat)?.subcategories?.find(s => s.id === p.subcategoryId);
          const pTags = tags.filter(t => (p.tagIds || []).includes(t.id));
          
          const matchesCat = dbCat ? (dbCat.zh.includes(query) || dbCat.en.toLowerCase().includes(query) || dbCat.ms.toLowerCase().includes(query)) : (legacyCat?.name.toLowerCase().includes(query) || legacyCat?.aliases.some(a => a.toLowerCase().includes(query)));
          const matchesSub = sub?.name.toLowerCase().includes(query) || sub?.aliases.some(a => a.toLowerCase().includes(query));
          const matchesTags = pTags.some(t => t.name.toLowerCase().includes(query) || t.aliases.some(a => a.toLowerCase().includes(query)));
          const matchesNote = (p.description || '').toLowerCase().includes(query) || (p.note || '').toLowerCase().includes(query);
          const matchesGroupId = p.groupId?.toLowerCase().includes(query);
          
          if (!matchesCat && !matchesSub && !matchesTags && !matchesNote && !matchesGroupId) return false;
        } else {
          // Public mode: search against string fields directly
          const matchesCat = (p.category || '').toLowerCase().includes(query);
          const matchesSub = (p.sub_category || '').toLowerCase().includes(query);
          const matchesTags = (p.tags || []).some(t => t.toLowerCase().includes(query));
          const matchesNote = (p.description || '').toLowerCase().includes(query) || (p.note || '').toLowerCase().includes(query);
          const matchesGroupId = p.groupId?.toLowerCase().includes(query);
          if (!matchesCat && !matchesSub && !matchesTags && !matchesNote && !matchesGroupId) return false;
        }
      }
      
      return true;
    });
  }, [activePhotosSource, filterCatId, filterSubId, filterTagIds, searchQuery, categories, tags, viewMode]);

  const displayPhotos = useMemo(() => {
    if (!showGroupsCollapsed) return filteredPhotos;
    const groupsSeen = new Set<string>();
    return filteredPhotos.filter(p => {
      if (!p.groupId) return true;
      if (groupsSeen.has(p.groupId)) return false;
      groupsSeen.add(p.groupId);
      return true;
    });
  }, [filteredPhotos, showGroupsCollapsed]);

  // --- Handlers ---
  const handleBatchAiIdentify = async () => {
    // Check key
    const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
    
    // 檢查是否有分類或標籤。如果缺少分類「或」缺少標籤，就會進行 AI 辨識。
    const unProcessed = photos.filter(p => (!p.categoryId || !p.tagIds || p.tagIds.length === 0) && !p.isAnalyzing);
    
    if (unProcessed.length === 0) {
      setAlertDialog({ title: '提示', message: '所有照片都已經有分類和標籤了，無需重複識別。' });
      return;
    }
    
    if (!effectiveKey) {
      setAlertDialog({ title: '提示', message: '請先在設定中設定 AI 金鑰' });
      return;
    }

    setBatchProgress({ current: 0, total: unProcessed.length });
    setIsBatchAnalyzing(true);
    cancelBatchAiRef.current = false;
    let successCount = 0;

    try {
      for (let i = 0; i < unProcessed.length; i++) {
        if (cancelBatchAiRef.current) break;
        
        const photo = unProcessed[i];
        setBatchProgress(prev => ({ ...prev, current: i + 1 }));
        
        // Mark as analyzing
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: true } : p));
        
        try {
          console.log(`DEBUG: Calling analyzeProductPhoto for ${photo.id}`);
          const result = await analyzeProductPhoto(photo.uri, catsRef.current, tagsRef.current, effectiveKey, aiProvider, customModel);
          console.log(`DEBUG: Result for ${photo.id}:`, result);
          
          let finalCatId = result.categoryId || null;
          let finalSubId = result.subcategoryId || null;
          let finalTagIds = result.tagIds || [];
          
          // Sync logic for new cats/tags
          // ... (keep the existing logic)
          if (result.newCategoryName && !result.categoryId) {
            const newCat = { id: crypto.randomUUID(), name: result.newCategoryName, aliases: [], subcategories: [] };
            setCategories(prev => [...prev, newCat]);
            finalCatId = newCat.id;
          } else if (result.newSubCategoryName && !result.subcategoryId && finalCatId) {
             const newSubId = crypto.randomUUID();
             setCategories(prev => prev.map(c => c.id === finalCatId ? {
               ...c, subcategories: [...c.subcategories, { id: newSubId, name: result.newSubCategoryName, aliases: []}]
             } : c));
             finalSubId = newSubId;
          }
          
          if (result.newTagName) {
            const newTagId = crypto.randomUUID();
            setTags(prev => [...prev, { id: newTagId, name: result.newTagName, aliases: [] }]);
            finalTagIds.push(newTagId);
          }

          setPhotos(prev => prev.map(p => p.id === photo.id ? { 
            ...p, 
            categoryId: finalCatId, 
            subcategoryId: finalSubId, 
            tagIds: finalTagIds,
            name: result.name || p.name,
            category: categories.find(c => c.id === finalCatId)?.name || result.newCategoryName || p.category,
            sub_category: categories.find(c => c.id === finalCatId)?.subcategories.find(s => s.id === finalSubId)?.name || result.newSubCategoryName || p.sub_category,
            tags: tags.filter(t => finalTagIds.includes(t.id)).map(t => t.name),
            dimensions: result.dimensions || p.dimensions,
            isAnalyzing: false 
          } : p));
          successCount++;

        } catch (err: any) {
          console.error("Batch AI skipped photo due to error:", photo.id, err);
          const errorDetail = err.message || '未知錯誤';
          
          let alertMsg = `AI 辨識失敗。\n\n照片 ID: ${photo.id}\n錯誤原因: ${errorDetail}\n\n請檢查 API 金鑰是否有效、該金鑰是否支援視覺模型並且有足夠權限。`;
          
          // Notify user
          setAlertDialog({ title: '辨識失敗', message: alertMsg });
          
          setPhotos(prev => prev.map(p => p.id === photo.id ? { 
            ...p, 
            isAnalyzing: false 
          } : p));
          
          // Stop batch process immediately if an API fails (like 400, 401, quota, deprecation)
          break;
        }
      }
      if (successCount > 0) {
        setAlertDialog({ title: '處理完成', message: `處理終止或完成！成功辨識了 ${successCount} 張照片。` });
      }
    } finally {
      setIsBatchAnalyzing(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  };

  const handlePhotoImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const useAi = !!geminiApiKey || !!process.env.GEMINI_API_KEY;
    const fileArray = Array.from(files) as File[];
    
    setIsImporting(true);
    setActiveScreen('home');

    const CHUNK_SIZE = 3;
    for (let i = 0; i < fileArray.length; i += CHUNK_SIZE) {
      const chunk = fileArray.slice(i, i + CHUNK_SIZE);
      const newPhotosDraft: Photo[] = [];
      
      for (const file of chunk) {
        try {
          const rawUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsDataURL(file);
          });
          
          if (!rawUri) {
            console.warn("Raw photo URI is empty, skipping");
            continue;
          }

          const compressedUri = await compressImage(rawUri);
          const imgHash = calculateMD5(compressedUri);

          const isLocalDuplicate = photosRef.current.some(p => p.image_hash === imgHash) || newPhotosDraft.some(p => p.image_hash === imgHash);
          if (isLocalDuplicate) continue;
          
          if (user) {
            const existingManualCode = await checkImageHashExists(user.id, imgHash);
            if (existingManualCode) {
              setAlertDialog({ 
                title: '重複記錄跳過', 
                message: `照片「${file.name}」以前已經錄入過。\n手動編號：${existingManualCode}\n系統已自動跳過此照片。` 
              });
              continue;
            }
          }

          const storageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const dbId = crypto.randomUUID();

          const newPhoto: Photo = {
            id: dbId,
            storageId: storageId,
            item_code: generateItemCode(),
            manual_code: '',
            image_hash: imgHash,
            name: file.name.split('.')[0] || '未命名家具',
            category: '未分類',
            sub_category: '',
            tags: [],
            description: '',
            image_url: '',
            uri: compressedUri,
            categoryId: null,
            subcategoryId: null,
            tagIds: [],
            createdAt: new Date().toISOString(),
            groupId: null,
            isAnalyzing: !!useAi
          };
          
          newPhotosDraft.push(newPhoto);
          
          if (useAi) {
            (async (targetPhoto: Photo) => {
              try {
                const result = await analyzeProductPhoto(targetPhoto.uri!, catsRef.current, tagsRef.current, geminiApiKey, aiProvider, customModel);
                
                let finalCatId = result.categoryId || null;
                let finalSubId = result.subcategoryId || null;
                let finalTagIds = result.tagIds || [];
                
                if (result.newCategoryName && !result.categoryId) {
                  const newCat = { id: crypto.randomUUID(), name: result.newCategoryName, aliases: [], subcategories: [] };
                  setCategories(prev => [...prev, newCat]);
                  finalCatId = newCat.id;
                } else if (result.newSubCategoryName && !result.subcategoryId && finalCatId) {
                  const newSubId = crypto.randomUUID();
                  setCategories(prev => prev.map(c => c.id === finalCatId ? {
                    ...c, subcategories: [...c.subcategories, { id: newSubId, name: result.newSubCategoryName, aliases: []}]
                  } : c));
                  finalSubId = newSubId;
                }
                
                if (result.newTagName) {
                  const newTagId = crypto.randomUUID();
                  setTags(prev => [...prev, { id: newTagId, name: result.newTagName, aliases: [] }]);
                  finalTagIds.push(newTagId);
                }
                
                setPhotos(prev => prev.map(p => p.id === dbId ? { 
                  ...p, 
                  categoryId: finalCatId, 
                  subcategoryId: finalSubId, 
                  tagIds: finalTagIds,
                  name: result.name || p.name,
                  category: catsRef.current.find(c => c.id === finalCatId)?.name || result.newCategoryName || p.category,
                  sub_category: catsRef.current.find(c => c.id === finalCatId)?.subcategories.find(s => s.id === finalSubId)?.name || result.newSubCategoryName || p.sub_category,
                  tags: tagsRef.current.filter(t => finalTagIds.includes(t.id)).map(t => t.name),
                  dimensions: result.dimensions || p.dimensions,
                  isAnalyzing: false 
                } : p));
              } catch (err: any) {
                console.error("AI Analysis failed:", err);
                setPhotos(prev => prev.map(p => p.id === dbId ? { ...p, isAnalyzing: false } : p));
              }
            })(newPhoto);
          }
        } catch (err: any) {
          console.error("Import processing error for one file:", err);
          alert(`照片「${file.name}」處理失敗：${err.message || '未知錯誤'}`);
        }
      }
      
      // Update photos state with the processed chunk
      if (newPhotosDraft.length > 0) {
        setPhotos(prev => [...newPhotosDraft, ...prev]);
        // Small delay to allow UI to render and JS engine to breathe
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    setIsImporting(false);
  };

  const saveNewPhoto = async () => {
    if (!newPhotoData && !editPhotoId) return;
    
    try {
      const selectedDbCat = dbCategories.find(c => c.code === addCatId);
      const catCode = selectedDbCat?.code || addCatId || 'others';
      const catName = selectedDbCat ? (selectedDbCat[appLang] || selectedDbCat.zh) : (categories.find(c => c.id === addCatId)?.name || '未分類');
      
      const subName = categories.find(c => c.id === addCatId)?.subcategories.find(s => s.id === addSubId)?.name || '';
      const tagNames = tags.filter(t => addTagIds.includes(t.id)).map(t => t.name);
      
      const compressedData = newPhotoData ? await compressImage(newPhotoData) : null;
      const imgHash = compressedData ? calculateMD5(compressedData) : (editPhotoId ? photos.find(p => p.id === editPhotoId)?.image_hash : '');
      
      if (editPhotoId) {
        setPhotos(prev => prev.map(p => p.id === editPhotoId ? {
          ...p,
          ...(compressedData ? { uri: compressedData, image_hash: imgHash } : {}),
          categoryId: addCatId,
          subcategoryId: addSubId,
          tagIds: addTagIds,
          category: catCode,
          sub_category: subName,
          tags: tagNames,
          description: addNote,
          manual_code: addManualCode,
          dimensions: {
            length: Number(addDimL) || 0,
            width: Number(addDimW) || 0,
            height: Number(addDimH) || 0,
            unit: 'cm'
          }
        } : p));
        setEditPhotoId(null);
      } else {
        // Check for local duplicates first
        const isLocalDuplicate = photos.some(p => p.image_hash === imgHash);
        if (isLocalDuplicate) {
          // Just return silently as per user request to avoid too many alerts
          return;
        }

        // Check for duplicates in Cloud if logged in
        if (user && imgHash) {
          const existingManualCode = await checkImageHashExists(user.id, imgHash);
          if (existingManualCode) {
            setAlertDialog({ 
              title: '提示', 
              message: `照片已存在！\n編號：${existingManualCode}` 
            });
            return;
          }
        }

        const storageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const dbId = crypto.randomUUID();
        let cloudUrl = '';
        if (user && compressedData) {
          cloudUrl = await uploadImage(user.id, storageId, compressedData);
        }

        const newPhoto: Photo = {
          id: dbId,
          storageId: storageId,
          item_code: generateItemCode(),
          manual_code: addManualCode,
          image_hash: imgHash || '',
          name: '新家具紀錄',
          category: catCode,
          sub_category: subName,
          tags: tagNames,
          description: addNote,
          image_url: cloudUrl,
          uri: compressedData || '',
          categoryId: addCatId,
          subcategoryId: addSubId,
          tagIds: addTagIds,
          createdAt: new Date().toISOString(),
          groupId: null,
          dimensions: {
            length: Number(addDimL) || 0,
            width: Number(addDimW) || 0,
            height: Number(addDimH) || 0,
            unit: 'cm'
          }
        };
        
        if (user && cloudUrl) {
          await savePhotoToCloud(user.id, newPhoto);
        }
        
        setPhotos([newPhoto, ...photos]);
      }
      resetAddState();
      setActiveScreen('home');
    } catch (err: any) {
      console.error("Save failed:", err);
      setAlertDialog({ title: '保存失敗', message: err.message || '請檢查網路' });
    }
  };

  const resetAddState = () => {
    setNewPhotoData(null);
    setEditPhotoId(null);
    setBatchEditIds(null);
    setAddCatId(null);
    setAddSubId(null);
    setAddTagIds([]);
    setAddNote('');
    setAddManualCode('');
    setAddDimL('');
    setAddDimW('');
    setAddDimH('');
    setShowOtherFields(false);
  };

  const saveBatchEdit = () => {
    if (!batchEditIds) return;
    // Allow saving if either a category is selected OR at least one tag is selected OR a manual code is set
    if (!addCatId && addTagIds.length === 0 && !addManualCode) return;

    setPhotos(prev => prev.map(p => {
      if (!batchEditIds.includes(p.id)) return p;
      
      const newCatId = addCatId || p.categoryId;
      const newSubId = addSubId || p.subcategoryId;
      const newTagIds = addTagIds.length > 0 ? addTagIds : p.tagIds;
      
      const catName = categories.find(c => c.id === newCatId)?.name || p.category || '未分類';
      const subName = categories.find(c => c.id === newCatId)?.subcategories.find(s => s.id === newSubId)?.name || (newSubId === p.subcategoryId ? p.sub_category : '');
      const tagNames = tags.filter(t => newTagIds.includes(t.id)).map(t => t.name);

      return {
        ...p,
        categoryId: newCatId,
        subcategoryId: newSubId,
        tagIds: newTagIds,
        category: catName,
        sub_category: subName,
        tags: tagNames,
        manual_code: addManualCode || p.manual_code,
        dimensions: (addDimL || addDimW || addDimH) ? {
          length: Number(addDimL) || p.dimensions?.length || 0,
          width: Number(addDimW) || p.dimensions?.width || 0,
          height: Number(addDimH) || p.dimensions?.height || 0,
          unit: 'cm'
        } : p.dimensions
      };
    }));
    resetAddState();
    setIsMultiSelect(false);
    setSelectedIds([]);
  };

  const togglePhotoSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      if (next.length === 0) setIsMultiSelect(false);
      return next;
    });
  };

  const handleGroupPhotos = () => {
    if (selectedIds.length < 2) {
      setAlertDialog({ title: '提示', message: '請至少選取兩張照片。' });
      return;
    }
    const newGroupId = 'G' + Math.floor(1000 + Math.random() * 9000);
    setPhotos(prev => prev.map(p => 
      selectedIds.includes(p.id) ? { ...p, groupId: newGroupId } : p
    ));
    setIsMultiSelect(false);
    setSelectedIds([]);
  };

  const handleUngroup = (gid: string) => {
    setPhotos(prev => prev.map(p => p.groupId === gid ? { ...p, groupId: null } : p));
  };

  const handleShare = async () => {
    if (selectedIds.length === 0) return;
    const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));

    try {
      if (navigator.share) {
        // Prepare files for sharing from base64 data URIs
        const shareFiles = await Promise.all(
          selectedPhotos.map(async (photo, index) => {
            const res = await fetch(photo.uri);
            const blob = await res.blob();
            // Assign a reliable filename with jpg extension since we compressed as image/jpeg
            return new File([blob], `photoX_${new Date().getTime()}_${index + 1}.jpg`, { type: 'image/jpeg' });
          })
        );

        if (navigator.canShare && navigator.canShare({ files: shareFiles })) {
          await navigator.share({
            title: 'photoX 照片分享',
            files: shareFiles
          });
          return; // Exit after successful share
        }
      } 
      
      // Fallback: If share API fails or is not supported (WebView environment)
      setAlertDialog({ title: '提示', message: '環境不支援分享，改為自動下載' });
      selectedPhotos.forEach((photo, index) => {
        // slight delay to prevent popup blockers for multiple downloads
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = photo.uri;
          link.download = `photoX_export_${new Date().getTime()}_${index + 1}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 200);
      });

    } catch (err) {
      console.error('Share/Download error:', err);
      // Sometimes user cancelling share throws an error, we ignore it usually. If it fails, fallback to download.
      if (err instanceof Error && err.name !== 'AbortError') {
        setAlertDialog({ title: '提示', message: '分享或下載失敗' });
      }
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
    const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));
    setConfirmDialog({
      message: `確定要刪除這 ${selectedIds.length} 張照片嗎？`,
      onConfirm: async () => {
        setPhotos(prev => prev.filter(p => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        setIsMultiSelect(false);
        if (user) {
          for (const photo of selectedPhotos) {
            try {
              await deletePhotoFromCloud(user.id, photo);
            } catch (err) {
              console.error("Cloud deletion error:", err);
            }
          }
        }
      }
    });
  };

  // --- UI Render Functions (Defined as functions to prevent remounting) ---
  const renderMainHeader = () => (
    <header className="relative z-50 bg-white/10 border-b border-white/20 px-6 pt-10 pb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          {viewMode === 'public' ? 'Public Gallery' : 'photoX'}
        </h1>
        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">
          {viewMode === 'public' ? `共 ${publicPhotos.length} 張公開照片` : `已匯入 ${photos.length} 張照片`}
        </p>
      </div>
      <div className="flex items-center gap-2 relative z-50">
        {!user ? (
          <button 
            onClick={async () => {
              try {
                await loginWithGoogle();
              } catch(e: any) {
                alert('登入失敗: ' + (e.message || JSON.stringify(e)));
              }
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-800 shadow-sm border border-slate-200"
          >
            登入管理
          </button>
        ) : (
          <button 
            onClick={() => setViewMode(viewMode === 'public' ? 'private' : 'public')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${viewMode === 'public' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}
          >
            {viewMode === 'public' ? '我的相庫' : '公開探索'}
          </button>
        )}

        {viewMode === 'private' && (
          <>
            <button 
              onClick={handleBatchAiIdentify}
              disabled={isBatchAnalyzing}
              className={`cursor-pointer touch-manipulation relative z-50 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1 shadow-sm ${isBatchAnalyzing ? 'bg-purple-600 text-white' : 'bg-white/60 border-white/50 text-purple-600 hover:bg-purple-50'}`}
            >
              {isBatchAnalyzing ? (
                 <><span className="animate-pulse">AI {batchProgress.current}/{batchProgress.total}</span></>
              ) : (
                 <><Sparkles size={14} className="text-purple-500" /> AI</>
              )}
            </button>
            <button 
              onClick={() => {
                if (isMultiSelect) {
                  if (selectedIds.length === filteredPhotos.length) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(filteredPhotos.map(p => p.id));
                  }
                } else {
                  setIsMultiSelect(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${isMultiSelect ? 'bg-blue-500 border-blue-500 text-white shadow-lg' : 'bg-white/60 border-white/50 text-slate-600'}`}
            >
              {isMultiSelect ? (selectedIds.length === filteredPhotos.length ? '✕' : '全選') : '選擇'}
            </button>
            <div className="flex bg-white/40 backdrop-blur-md border border-white/50 rounded-xl overflow-hidden p-0.5 shadow-sm">
              {[
                { id: 'zh', label: '中文' },
                { id: 'en', label: 'EN' },
                { id: 'ms', label: 'BM' }
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => setAppLang(l.id as any)}
                  className={`px-3 py-1 text-[10px] font-black tracking-wider transition-all rounded-[9px] ${appLang === l.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
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
          </>
        )}
      </div>
    </header>
  );

  const renderSearchAndFilter = () => (
    <div className="bg-transparent px-6 py-2 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="搜尋..."
            className="w-full bg-white/40 border border-white/50 rounded-xl py-2 pl-9 pr-4 text-xs focus:bg-white/80 transition-all outline-none text-slate-800 placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
          className={`p-2 rounded-xl border transition-all ${showGroupsCollapsed ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white/40 border-white/50 text-slate-500'}`}
          title={showGroupsCollapsed ? "展開群組" : "合併群組"}
        >
          <Layers size={16} />
        </button>
      </div>

      <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar">
        <button 
          onClick={() => { setFilterCatId(null); setFilterSubId(null); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight whitespace-nowrap transition-all border ${!filterCatId ? 'bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white/40 border-white/40 text-slate-600'}`}
        >
          全部
        </button>
        {dbCategories.map(cat => (
          <button 
            key={cat.code}
            onClick={() => { setFilterCatId(cat.code); setFilterSubId(null); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tight whitespace-nowrap transition-all border ${filterCatId === cat.code ? 'bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white/40 border-white/40 text-slate-600'}`}
          >
            {cat[appLang] || cat.zh}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {(filterCatId || tags.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {filterCatId && (
              <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar">
                <button 
                  onClick={() => setFilterSubId(null)}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter whitespace-nowrap border transition-all ${!filterSubId ? 'bg-slate-600 border-slate-600 text-white' : 'bg-white/40 border-white/20 text-slate-500'}`}
                >
                  ALL
                </button>
                {categories.find(c => c.id === filterCatId)?.subcategories.map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => setFilterSubId(sub.id)}
                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter whitespace-nowrap border transition-all ${filterSubId === sub.id ? 'bg-slate-600 border-slate-600 text-white' : 'bg-white/40 border-white/20 text-slate-500'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar">
              {tags.map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => setFilterTagIds(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap transition-all border ${filterTagIds.includes(tag.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-100/40 border-slate-200/40 text-slate-500'}`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderHomeView = () => (
    <div className="flex flex-col min-h-screen bg-transparent pb-32">
      {renderMainHeader()}
      {renderSearchAndFilter()}
      
      <div className="px-6 py-2">
        <div className="grid grid-cols-3 gap-3">
          {displayPhotos.map((photo) => {
            const groupPhotos = photo.groupId ? photos.filter(p => p.groupId === photo.groupId) : [];
            const isGroupMaster = photo.groupId && showGroupsCollapsed;
            const groupCount = groupPhotos.length;
            const isGroupSelected = isGroupMaster ? groupPhotos.every(p => selectedIds.includes(p.id)) : selectedIds.includes(photo.id);

            return (
              <PhotoCard 
                key={photo.id}
                photo={photo}
                isMultiSelect={isMultiSelect}
                isSelected={isGroupSelected}
                isGroupMaster={isGroupMaster}
                groupCount={groupCount}
                categoryName={(() => {
                  const code = photo.category;
                  const dbCat = dbCategories.find(c => c.code === code);
                  return dbCat ? (dbCat[appLang] || dbCat.zh) : categories.find(c => c.id === photo.categoryId)?.name || code;
                })()}
                onClick={() => {
                  if (isMultiSelect) {
                    if (isGroupMaster) {
                      const gIds = groupPhotos.map(p => p.id);
                      if (isGroupSelected) {
                        const next = selectedIds.filter(id => !gIds.includes(id));
                        setSelectedIds(next);
                        if (next.length === 0) setIsMultiSelect(false);
                      } else {
                        setSelectedIds(prev => [...new Set([...prev, ...gIds])]);
                      }
                    } else {
                      togglePhotoSelection(photo.id);
                    }
                  } else {
                    if (isGroupMaster) {
                      setActiveGroupId(photo.groupId!);
                    } else {
                      setPreviewUri(photo.uri);
                    }
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (viewMode === 'public' || !user) return;
                  setEditPhotoId(photo.id);
                  setAddCatId(photo.categoryId);
                  setAddSubId(photo.subcategoryId);
                  setAddTagIds(photo.tagIds);
                  setAddNote(photo.note);
                  setNewPhotoData(photo.uri);
                }}
              />
            );
          })}
        </div>
        
        {displayPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white/50 shadow-sm">
              <ImageIcon size={32} className="opacity-40" />
            </div>
            <p className="text-xs font-medium">找不到符合條件的照片</p>
          </div>
        )}
      <AnimatePresence>
        {isMultiSelect && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-10 left-10 right-10 z-40 bg-white/80 backdrop-blur-xl rounded-[32px] p-4 flex flex-col gap-3 shadow-2xl border border-white/50"
          >
            <div className="flex justify-between items-center px-2">
              <span className={`text-xs font-bold transition-colors ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                {selectedIds.length > 0 ? `已選取 ${selectedIds.length} 張` : `選取照片`}
              </span>
              <button 
                onClick={() => { setIsMultiSelect(false); setSelectedIds([]); }}
                className="text-[10px] text-slate-400 font-medium hover:text-slate-600"
              >
                結束選擇
              </button>
            </div>
            <div className="flex gap-4 items-center justify-center">
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

                <button 
                  disabled={selectedIds.length < 2}
                  onClick={handleGroupPhotos}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm group-active:scale-90 transition-transform">
                     <Layers size={18} />
                   </div>
                   <span className="text-[9px] mt-1 text-purple-600 font-bold">設為同組</span>
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
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );

  const renderBatchEditScreen = () => (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
      <div className="px-6 py-4 border-b border-white/50 flex items-center justify-between">
        <button onClick={resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <X size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800">批量修改 ({batchEditIds?.length} 張)</h2>
        <button 
          onClick={() => {
            if (!addCatId && addTagIds.length === 0) {
              setAlertDialog({ title: '提示', message: "請選取「主分類」或「標籤」" });
              return;
            }
            saveBatchEdit();
          }}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
        >
          套用
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-20">
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-2">
          <p className="text-[11px] text-blue-600 font-bold leading-relaxed">
            注意：這會更新所有選中照片。僅手動修改的欄位會被套用。
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目標主分類 *</h3>
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
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目標子分類</h3>
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
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一標籤</h3>
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

        <section className="space-y-3">
          <button 
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="w-full flex items-center justify-between p-4 bg-white/60 border border-white rounded-3xl text-sm font-bold text-slate-700 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ChevronRight size={18} className={`transition-transform duration-300 ${showOtherFields ? 'rotate-90' : ''}`} />
              <span>其他資訊 (編號、尺寸)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">
              {showOtherFields ? '收起' : '展開'}
            </span>
          </button>

          <AnimatePresence>
            {showOtherFields && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 pt-1"
              >
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">編號</h3>
                  <input 
                    type="text" 
                    placeholder="輸入編號..."
                    value={addManualCode}
                    onChange={(e) => setAddManualCode(e.target.value)}
                    className="w-full bg-white/60 border border-white p-4 rounded-3xl text-sm outline-none focus:bg-white transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">家具尺寸 (長 x 寬 x 高) cm</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="長"
                        value={addDimL}
                        onChange={(e) => setAddDimL(e.target.value)}
                        className="w-full bg-white border border-slate-100 p-3 rounded-xl text-center text-sm font-bold shadow-sm"
                      />
                      <span className="absolute -top-2 left-2 px-1 bg-white text-[8px] text-slate-400 font-bold uppercase">Length</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="寬"
                        value={addDimW}
                        onChange={(e) => setAddDimW(e.target.value)}
                        className="w-full bg-white border border-slate-100 p-3 rounded-xl text-center text-sm font-bold shadow-sm"
                      />
                      <span className="absolute -top-2 left-2 px-1 bg-white text-[8px] text-slate-400 font-bold uppercase">Width</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="高"
                        value={addDimH}
                        onChange={(e) => setAddDimH(e.target.value)}
                        className="w-full bg-white border border-slate-100 p-3 rounded-xl text-center text-sm font-bold shadow-sm"
                      />
                      <span className="absolute -top-2 left-2 px-1 bg-white text-[8px] text-slate-400 font-bold uppercase">Height</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );

  const renderAddPhotoScreen = () => (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
      <div className="px-6 py-4 border-b border-white/50 flex items-center justify-between">
        <button onClick={() => { resetAddState(); setActiveScreen('home'); }} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
          <X size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800">{editPhotoId ? '編輯產品資訊' : '分類產品照片'}</h2>
        <div className="flex items-center gap-2">
          {editPhotoId && (
            <button 
              onClick={() => deletePhoto(editPhotoId)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={saveNewPhoto}
            className="bg-slate-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95"
          >
            儲存
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-20">
        <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center border border-white/20">
          {newPhotoData && <img src={newPhotoData} className="max-w-full max-h-full object-contain" alt="New" />}
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">主分類 *</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {dbCategories.map(cat => (
              <button 
                key={cat.code}
                onClick={() => { setAddCatId(cat.code); setAddSubId(null); }}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${addCatId === cat.code ? 'bg-white/80 border-slate-800 text-slate-800 shadow-md' : 'bg-white/40 border-white/50 text-slate-500 hover:bg-white/60'}`}
              >
                <span className="font-bold block text-sm">{cat[appLang] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-tighter opacity-60">{cat.en}</span>
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
          </div>
          <textarea 
            placeholder="輸入產品特色或注意事項..."
            className="w-full rounded-2xl border border-white/50 p-4 text-sm bg-white/50 shadow-inner focus:bg-white/80 transition-all outline-none text-slate-800 placeholder-slate-400"
            rows={4}
            value={addNote}
            onChange={(e) => setAddNote(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <button 
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="w-full flex items-center justify-between p-4 bg-white/60 border border-white rounded-3xl text-sm font-bold text-slate-700 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ChevronRight size={18} className={`transition-transform duration-300 ${showOtherFields ? 'rotate-90' : ''}`} />
              <span>其他資訊 (編號、尺寸)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">
              {showOtherFields ? '收起' : '展開'}
            </span>
          </button>

          <AnimatePresence>
            {showOtherFields && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 pt-1"
              >
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">編號</h3>
                  <input 
                    type="text" 
                    placeholder="輸入編號..."
                    value={addManualCode}
                    onChange={(e) => setAddManualCode(e.target.value)}
                    className="w-full bg-white/60 border border-white p-4 rounded-3xl text-sm outline-none focus:bg-white transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">家具尺寸 (長 x 寬 x 高) cm</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="長"
                        value={addDimL}
                        onChange={(e) => setAddDimL(e.target.value)}
                        className="w-full bg-white border border-slate-100 p-3 rounded-xl text-center text-sm font-bold shadow-sm"
                      />
                      <span className="absolute -top-2 left-2 px-1 bg-white text-[8px] text-slate-400 font-bold uppercase">Length</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="寬"
                        value={addDimW}
                        onChange={(e) => setAddDimW(e.target.value)}
                        className="w-full bg-white border border-slate-100 p-3 rounded-xl text-center text-sm font-bold shadow-sm"
                      />
                      <span className="absolute -top-2 left-2 px-1 bg-white text-[8px] text-slate-400 font-bold uppercase">Width</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="高"
                        value={addDimH}
                        onChange={(e) => setAddDimH(e.target.value)}
                        className="w-full bg-white border border-slate-100 p-3 rounded-xl text-center text-sm font-bold shadow-sm"
                      />
                      <span className="absolute -top-2 left-2 px-1 bg-white text-[8px] text-slate-400 font-bold uppercase">Height</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
          subcategories: (c.subcategories || []).filter(s => s.id !== subId)
        } : c));
        setPhotos(prev => prev.map(p => p.subcategoryId === subId ? { ...p, subcategoryId: null } : p));
      }
    });
  };

  const deletePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id);
    setConfirmDialog({
      message: '確定要刪除這張照片嗎？',
      onConfirm: async () => {
        setPhotos(prev => prev.filter(p => p.id !== id));
        if (editPhotoId === id) {
          resetAddState();
          setActiveScreen('home');
        }
        if (user && photo) {
          try {
            await deletePhotoFromCloud(user.id, photo);
          } catch (err) {
            console.error("Cloud deletion failed:", err);
          }
        }
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
          tagIds: (p.tagIds || []).filter(tid => tid !== id)
        })));
      }
    });
  };

  const renderManageScreen = () => {
    const addCategory = () => {
      if (!newCatName.trim()) return;
      const newCat: Category = {
        id: crypto.randomUUID(),
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
        subcategories: [...(c.subcategories || []), {
          id: crypto.randomUUID(),
          name: newSubName.trim(),
          aliases: [newSubName.trim()]
        }]
      } : c));
      setNewSubName('');
    };

    const addTag = () => {
      if (!newTagName.trim()) return;
      const newTag: Tag = {
        id: crypto.randomUUID(),
        name: newTagName.trim(),
        aliases: [newTagName.trim()]
      };
      setTags([...tags, newTag]);
      setNewTagName('');
    };

    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
        <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3 bg-white/40 pt-safe">
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

  const performPushSync = async () => {
    if (!user) return;
    setConfirmDialog({
      message: "警告：上傳備份將會以『目前本地資料』完整覆蓋雲端數據。如果雲端存有本地目前已刪除的照片，雲端上的對應記錄也將被移除。此操作不可逆，您確定要開始備份嗎？",
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncAction('push');
        setSyncPercent(0);
        try {
          await syncPhotosToCloud(user.id, photos, (p) => setSyncPercent(Math.round(p)));
          // Fetch updated photos from cloud to get proper image URLs
          const cloudPhotos = await loadPhotosFromCloud(user.id);
          if (cloudPhotos) {
            setPhotos(cloudPhotos);
            setCloudCount(cloudPhotos.length);
            await saveData('product_photos', cloudPhotos);
          }
          
          const now = Date.now();
          setLastSyncTime(now);
          await saveData('last_sync_time', now);
          alert('備份成功');
        } catch (e) {
          console.error(e);
          alert('同步發生錯誤: ' + JSON.stringify(e));
        } finally {
          setIsSyncing(false);
          setSyncAction('idle');
          setSyncPercent(0);
        }
      }
    });
  };

  const performPullSync = async () => {
    if (!user) return;
    setConfirmDialog({
      message: "警告：從雲端下載將會覆蓋您設備上目前的所有資料。如果您近期在本機有新增或刪除相片且「尚未上傳備份」，這些變更將因覆蓋而遺失。您確定要繼續下載雲端資料嗎？",
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncAction('pull');
        setSyncPercent(0);
        try {
          const cloudPhotos = await loadPhotosFromCloud(user.id);
          
          if (cloudPhotos) {
            setPhotos(cloudPhotos);
            setCloudCount(cloudPhotos.length);
            await saveData('product_photos', cloudPhotos);
          }
          
          const now = Date.now();
          setLastSyncTime(now);
          await saveData('last_sync_time', now);
          
          alert('下載並同步成功');
        } catch (e: any) {
          console.error(e);
          alert(`下載失敗: ${JSON.stringify(e)}`);
        } finally {
          setIsSyncing(false);
          setSyncAction('idle');
          setSyncPercent(0);
        }
      }
    });
  };

  const renderSettingsScreen = () => {
    if (activeScreen !== 'settings') return null;

    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
        <div className="px-6 py-4 border-b border-white/50 flex items-center gap-3 pt-safe">
          <button onClick={() => setActiveScreen('manage')} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="font-bold text-lg text-slate-800 flex-1 ml-1">其他設定</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 pb-20">
          {/* Supabase Cloud Sync Section */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 shadow-xl border border-white/10 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all duration-700"></div>
            
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Cloud size={18} className={user ? 'text-blue-400' : 'text-slate-500'} />
                雲端同步中心
              </h4>
              {user && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 rounded-full border border-blue-500/30">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-bold text-blue-300 uppercase leading-none">Connected</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              將您的家具照片、目錄分類及標籤備份至 Supabase 雲端。透過此功能，您可以在多台設備（iOS、Android、網頁）之間同步產品目錄，且照片會自動壓縮轉換為 webp 格式以節省雲端空間。
            </p>

            {!user ? (
              <button 
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch(e) {
                    alert('登入失敗: ' + JSON.stringify(e));
                  }
                }}
                className="w-full bg-white text-slate-900 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <LogIn size={16} /> 使用 Google 登入
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-10 h-10 rounded-full border border-white/20 shadow-sm" alt="Avatar" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-bold border border-white/10 uppercase">
                        {String(user?.displayName || user?.email || 'U').charAt(0)}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-white text-xs font-black truncate">{String(user?.displayName || user?.email || '')}</p>
                      <p className="text-[9px] text-slate-500 font-medium truncate">{String(user?.email || '')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { 
                      setConfirmDialog({
                        message: '確定要登出嗎？您的本地數據將會保留，但無法繼續自動同步。',
                        onConfirm: () => {
                          logout(); 
                          setUser(null);
                          setActiveScreen('home');
                        }
                      });
                    }}
                    className="bg-white/10 hover:bg-red-500/20 text-white px-4 py-2 rounded-xl transition-all active:scale-90 text-[10px] font-bold border border-white/10 flex items-center gap-2"
                  >
                    <LogOut size={14} /> 登出雲端
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={performPushSync}
                    disabled={isSyncing}
                    className="bg-blue-500 text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSyncing && syncAction === 'push' ? (
                      <>
                        <RefreshCcw size={16} className="animate-spin" />
                        上傳中...
                      </>
                    ) : (
                      <>
                        <CloudUpload size={16} />
                        上傳備份
                      </>
                    )}
                  </button>
                  <button 
                    onClick={performPullSync}
                    disabled={isSyncing}
                    className="bg-red-500 text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSyncing && syncAction === 'pull' ? (
                      <>
                        <RefreshCcw size={16} className="animate-spin" />
                        下載中...
                      </>
                    ) : (
                      <>
                        <CloudDownload size={16} />
                        下載備份
                      </>
                    )}
                  </button>
                  <div className="col-span-2 bg-white/5 border border-white/10 flex flex-col items-center justify-center rounded-2xl p-2 text-center">
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">雲端同步狀態</p>
                    <p className="text-[10px] text-slate-300 font-mono">
                      {cloudCount !== null ? cloudCount : '?'} 張照片 | {lastSyncTime ? (isNaN(new Date(Number(lastSyncTime) || lastSyncTime).getTime()) ? '時間未知' : new Date(Number(lastSyncTime) || lastSyncTime).toLocaleString('zh-TW')) : '尚未備份'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/50 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">✨ AI 智慧辨識切換器</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              您的應用程式已升級「通用 AI 引擎」。您可以貼上支援平台的 API Key 啟用極速辨識通道：
            </p>
            
            <div className="space-y-3">
              <input 
                type="password" 
                placeholder="請貼上您申請的 API Key..."
                className="font-mono w-full rounded-xl border border-white/50 p-3 text-xs bg-white/50 shadow-inner focus:bg-white/80 transition-all outline-none text-slate-800"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  localStorage.setItem('gemini_api_key_safe', obfuscateKey(e.target.value));
                }}
              />
              <input 
                type="text" 
                placeholder="指定特定模型 (選填，如: tencent/hy3-preview:free)"
                className="font-mono w-full rounded-xl border border-white/50 p-3 text-xs bg-white/50 shadow-inner focus:bg-white/80 transition-all outline-none text-slate-800"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  localStorage.setItem('ai_custom_model', e.target.value);
                }}
              />
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">數據管理</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              您的產品目錄均儲存在手機本機。建議定期匯出備份，避免數據意外遺失。
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
                匯出備份
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
                        alert('匯入成功');
                      } catch (err) {
                        alert('匯入失敗，請檢查文件格式');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                匯入備份
              </label>
            </div>
          </div>

          {/* Version Info */}
          <div className="pt-8 pb-4 flex flex-col items-center justify-center space-y-1 opacity-30">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Build Version</p>
            <p className="text-[10px] font-mono text-slate-400">2026.04.24.1724</p>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupDetailScreen = () => {
    const activePhotosSource = viewMode === 'public' ? publicPhotos : photos;
    const groupPhotos = activePhotosSource.filter(p => p.groupId === activeGroupId);
    if (groupPhotos.length === 0) return null;

    const focusedPhoto = focusedGroupPhotoId ? groupPhotos.find(p => p.id === focusedGroupPhotoId) : null;
    
    return (
      <div className="fixed inset-0 z-[110] bg-slate-50 flex flex-col">
        {/* Header Updated with Close Button */}
        <div className="px-6 py-4 border-b border-white/50 flex items-center justify-between bg-white/40 pt-safe">
          <button onClick={() => { setActiveGroupId(null); setFocusedGroupPhotoId(null); }} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 ml-1 text-center">
             <h2 className="font-bold text-lg text-slate-800 leading-tight">同組照片</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Group {activeGroupId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                const files = await Promise.all(groupPhotos.map(async (p, i) => {
                  const res = await fetch(p.uri);
                  const blob = await res.blob();
                  return new File([blob], `group_${activeGroupId}_${i+1}.jpg`, { type: 'image/jpeg' });
                }));

                if (navigator.share) {
                  try {
                    await navigator.share({
                      files: files,
                      title: `照片組 ${activeGroupId}`,
                    });
                  } catch (err) {
                    setAlertDialog({ title: '提示', message: '部分瀏覽器不支援多檔分享。' });
                  }
                }
              }}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              title="分享全組"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
           <div className="p-6 space-y-6 pb-20">
              
              {/* Focused Selection Preview */}
              <AnimatePresence>
                {focusedPhoto && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="aspect-square bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl relative group border border-white/20 mb-8"
                  >
                    <img 
                      src={focusedPhoto.uri} 
                      className="w-full h-full object-contain" 
                      onClick={() => setPreviewUri(focusedPhoto.uri)}
                      alt="Focused Photo" 
                    />
                    
                    {/* Minimal Floating Note Badge */}
                    <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                       <div className="bg-black/30 backdrop-blur-lg border border-white/20 p-3 rounded-2xl inline-block max-w-[85%] shadow-xl">
                          <p className="text-white text-[10px] font-medium leading-relaxed line-clamp-2 opacity-90">
                            {focusedPhoto.description || focusedPhoto.note || "點擊圖片查看大圖"}
                          </p>
                          {focusedPhoto.dimensions && (focusedPhoto.dimensions.length || focusedPhoto.dimensions.width || focusedPhoto.dimensions.height) && (
                            <div className="flex gap-2 mt-1 px-1">
                              <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest bg-blue-500/20 px-1 rounded">
                                {focusedPhoto.dimensions.length} x {focusedPhoto.dimensions.width} x {focusedPhoto.dimensions.height} {focusedPhoto.dimensions.unit || 'cm'}
                              </span>
                            </div>
                          )}
                       </div>
                    </div>

                    {viewMode === 'private' && user && (
                      <div className="absolute top-4 left-4 flex gap-1">
                        <button 
                          onClick={() => {
                            setEditPhotoId(focusedPhoto.id);
                            setAddCatId(focusedPhoto.categoryId);
                            setAddSubId(focusedPhoto.subcategoryId);
                            setAddTagIds(focusedPhoto.tagIds);
                            setAddNote(focusedPhoto.description || focusedPhoto.note || '');
                            setAddManualCode(focusedPhoto.manual_code || '');
                            setAddDimL(focusedPhoto.dimensions?.length?.toString() || '');
                            setAddDimW(focusedPhoto.dimensions?.width?.toString() || '');
                            setAddDimH(focusedPhoto.dimensions?.height?.toString() || '');
                            setNewPhotoData(focusedPhoto.uri);
                            setActiveScreen('add');
                          }}
                          className="bg-black/40 backdrop-blur-md p-2 rounded-xl text-white/80 hover:bg-blue-600 transition-colors shadow-lg border border-white/10"
                          title="編輯此相片"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={() => setFocusedGroupPhotoId(null)}
                      className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full text-white/80 hover:bg-black/60 transition-colors"
                    >
                      <Minimize2 size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Compact Unified Editing Header/Toggle */}
              <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white shadow-sm overflow-hidden">
                <button 
                  onClick={() => setIsUnifiedEditing(!isUnifiedEditing)}
                  className="w-full px-6 py-4 flex items-center justify-between active:bg-white/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${isUnifiedEditing ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Settings2 size={16} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xs font-bold text-slate-800">🛠️ 統一修改工具</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Batch Tagging & Category</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isUnifiedEditing ? 180 : 0 }}
                    className="text-slate-400"
                  >
                    <ChevronRight size={18} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isUnifiedEditing && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 space-y-4 pt-1 border-t border-white/40">
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">快速分類套用</p>
                          <div className="flex flex-wrap gap-2">
                            {categories.map(cat => {
                              const isAllMatch = groupPhotos.length > 0 && groupPhotos.every(p => p.categoryId === cat.id);
                              return (
                                <button 
                                  key={cat.id}
                                  onClick={() => setPhotos(prev => prev.map(p => p.groupId === activeGroupId ? { ...p, categoryId: cat.id, subcategoryId: null } : p))}
                                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm ${isAllMatch ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 active:bg-slate-50'}`}
                                >
                                  {cat.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {groupPhotos.length > 0 && groupPhotos.every(p => p.categoryId === groupPhotos[0].categoryId) && groupPhotos[0].categoryId && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                          >
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">子分類套用</p>
                            <div className="flex flex-wrap gap-2">
                              {categories.find(c => c.id === groupPhotos[0].categoryId)?.subcategories.map(sub => {
                                const isAllMatch = groupPhotos.every(p => p.subcategoryId === sub.id);
                                return (
                                  <button 
                                    key={sub.id}
                                    onClick={() => setPhotos(prev => prev.map(p => p.groupId === activeGroupId ? { ...p, subcategoryId: sub.id } : p))}
                                    className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-sm ${isAllMatch ? 'bg-slate-600 border-slate-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 active:bg-slate-50'}`}
                                  >
                                    {sub.name}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}

                         <div className="space-y-2">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">快速標籤套用</p>
                           <div className="flex flex-wrap gap-1.5">
                             {tags.map(tag => {
                               const isAllMatch = groupPhotos.every(p => (p.tagIds || []).includes(tag.id));
                               return (
                                 <button 
                                   key={tag.id}
                                   onClick={() => setPhotos(prev => {
                                     // Determine action: if not all have it, Add to all. 
                                     // If all have it, Remove from all.
                                     const notAllHaveItByGroupId = photos.filter(ph => ph.groupId === activeGroupId).some(p => !(p.tagIds || []).includes(tag.id));
                                     return prev.map(p => {
                                       if (p.groupId !== activeGroupId) return p;
                                       const hasIt = (p.tagIds || []).includes(tag.id);
                                       
                                       if (notAllHaveItByGroupId) {
                                         // Apply to all (if doesn't have it)
                                         return hasIt ? p : { ...p, tagIds: [...(p.tagIds || []), tag.id] };
                                       } else {
                                         // Remove from all
                                         return { ...p, tagIds: (p.tagIds || []).filter(id => id !== tag.id) };
                                       }
                                     });
                                   })}
                                   className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold transition-all ${isAllMatch ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 active:bg-slate-50'}`}
                                 >
                                   #{tag.name}
                                 </button>
                               );
                             })}
                           </div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
                    組內容 ({groupPhotos.length})
                  </h3>
                  {viewMode === 'private' && user && (
                    <button 
                      onClick={() => {
                        setConfirmDialog({
                          message: `確定要將這 ${groupPhotos.length} 張照片解除同組嗎？`,
                          onConfirm: () => {
                            handleUngroup(activeGroupId);
                            setActiveGroupId(null);
                            setFocusedGroupPhotoId(null);
                          }
                        });
                      }}
                      className="text-[10px] text-red-500 font-bold flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <X size={12} /> 解除群組
                    </button>
                  )}
                </div>
                
                {/* Fixed Grid for Group Management */}
                <div className="grid grid-cols-3 gap-3">
                  {groupPhotos.map((photo, idx) => (
                    <motion.div 
                      key={photo.id}
                      layoutId={`group-item-${photo.id}`}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFocusedGroupPhotoId(photo.id)}
                      className={`relative aspect-square rounded-2xl overflow-hidden shadow-md border-2 transition-all ${focusedGroupPhotoId === photo.id ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' : 'border-white'}`}
                    >
                      <img src={photo.uri} className="w-full h-full object-cover" alt={`Group index ${idx}`} />
                      <div className="absolute inset-0 bg-black/5" />
                      {idx === 0 && (
                        <div className="absolute top-1.5 left-1.5 bg-black/40 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-tighter ring-1 ring-white/20">
                           封面
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {viewMode === 'private' && user && (
                    <button 
                      onClick={() => {
                        setActiveGroupId(null);
                        setFocusedGroupPhotoId(null);
                        setIsMultiSelect(true);
                        setAlertDialog({ title: '提示', message: '請從主畫面選取照片' });
                      }}
                      className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors bg-white/40"
                    >
                      <Plus size={20} />
                      <span className="text-[8px] font-bold mt-1 uppercase">新增</span>
                    </button>
                  )}
                </div>
              </div>
           </div>
        </div>

        {/* Floating Close Button in Bottom Right for Mobile Ergonomics */}
        <div className="absolute bottom-10 right-8 z-[120]">
           <motion.button
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             onClick={() => { setActiveGroupId(null); setFocusedGroupPhotoId(null); }}
             className="w-14 h-14 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-2xl border border-white/20 active:bg-slate-900 transition-all group"
           >
             <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
           </motion.button>
        </div>
      </div>
    );
  };
  
  const renderLoginScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10 text-center">
      <div className="relative">
        <div className="w-24 h-24 bg-blue-500 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-blue-500/40 relative z-10">
          <ImageIcon size={48} className="text-white -rotate-12" />
        </div>
        <div className="absolute inset-0 bg-purple-500 rounded-3xl -rotate-6 shadow-xl opacity-50"></div>
      </div>
      
      <div className="space-y-3">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Furniture Album</h2>
        <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
          智能分類、標籤管理、雲端備份。<br/>
          一站式管理您的家具產品資訊。
        </p>
      </div>

      <div className="w-full space-y-4">
        <button 
          onClick={async () => {
            try {
              await loginWithGoogle();
            } catch(e: any) {
              alert('登入失敗: ' + (e.message || JSON.stringify(e)));
            }
          }}
          className="w-full bg-slate-900 text-white py-5 rounded-[24px] text-sm font-bold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] active:bg-black"
        >
          <LogIn size={20} /> 使用 Google 登入
        </button>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          登入以同步您的雲端相庫
        </p>
      </div>

      <div className="pt-10 flex gap-6 grayscale opacity-50">
        <div className="flex flex-col items-center gap-1">
          <Sparkles size={16} className="text-purple-500" />
          <span className="text-[10px] font-bold">AI 智慧</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Cloud size={16} className="text-blue-500" />
          <span className="text-[10px] font-bold">雲端同步</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Layers size={16} className="text-indigo-500" />
          <span className="text-[10px] font-bold">層次管理</span>
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
        <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
          {isInitializing ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Initializing...</p>
            </div>
          ) : (
            activeScreen === 'home' && (
              viewMode === 'public' ? (
                <PublicGallery 
                  photos={publicPhotos} 
                  dbCategories={dbCategories}
                  showExit={!!user} 
                  onExit={() => setViewMode('private')} 
                  onLogin={async () => {
                    try {
                      await loginWithGoogle();
                    } catch(e: any) {
                      alert('登入失敗: ' + (e.message || JSON.stringify(e)));
                    }
                  }}
                />
              ) : (
                renderHomeView()
              )
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {(activeScreen === 'add' || editPhotoId) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderAddPhotoScreen()}
          </motion.div>
        )}
        {batchEditIds && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderBatchEditScreen()}
          </motion.div>
        )}
        {activeScreen === 'manage' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderManageScreen()}
          </motion.div>
        )}
        {activeScreen === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderSettingsScreen()}
          </motion.div>
        )}
        {activeGroupId && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}>
            {renderGroupDetailScreen()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen preview optimized for screenshots */}
      <AnimatePresence>
        {previewUri && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
            onClick={() => setPreviewUri(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full h-full flex items-center justify-center p-0"
            >
              <img 
                src={previewUri} 
                className="max-w-full max-h-full object-contain"
                alt="Fullscreen preview"
              />
              
              {/* Subtle close hint that fades out */}
              <motion.div 
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-medium tracking-widest uppercase pointer-events-none"
              >
                點擊任意處退出
              </motion.div>
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
            className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
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
            className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
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

      {/* Custom Alert Dialog */}
      <AnimatePresence>
        {alertDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setAlertDialog(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-white rounded-[24px] p-6 shadow-2xl overflow-hidden relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-slate-800 text-lg mb-2">{alertDialog.title}</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed whitespace-pre-wrap text-left">
                {alertDialog.message}
              </p>
              <button 
                onClick={() => setAlertDialog(null)}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Footer / Mobile Nav could go here if needed */}
      {/* AI Progress Toast / Overlay */}
      <AnimatePresence>
        {isBatchAnalyzing && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-28 left-6 right-6 z-[160] bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-purple-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/40">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="flex-1">
               <div className="flex justify-between items-end mb-1.5">
                  <p className="text-white text-[11px] font-bold">批量 AI 智能辨識中...</p>
                  <p className="text-purple-400 text-[10px] font-black">{batchProgress.current} / {batchProgress.total}</p>
               </div>
               <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  />
               </div>
            </div>
            
            <button 
              onClick={() => { cancelBatchAiRef.current = true; }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all shrink-0"
              title="取消辨識"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Import Progress Overlay */}
      <AnimatePresence>
        {isImporting && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-white/80 backdrop-blur-md border border-blue-100 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">正在匯入大量照片中...</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Cloud Sync Progress Overlay */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-8"
          >
            <div className="w-full max-w-[300px] bg-white rounded-[32px] p-8 shadow-2xl flex flex-col items-center">
              <div className="w-16 h-16 relative mb-6">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={175.92}
                    strokeDashoffset={175.92 - (175.92 * syncPercent) / 100}
                    className="text-blue-500 transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cloud className="text-blue-500 animate-pulse" size={24} />
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">雲端備份進行中</h3>
              <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-widest">
                {syncAction === 'push' ? '正在將資料存入 Supabase' : '正在從 Supabase 獲取資料'}
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${syncPercent}%` }}
                />
              </div>
              <p className="text-center text-slate-600 font-bold text-sm">
                {syncPercent}%
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

