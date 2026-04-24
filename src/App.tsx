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
  CloudDownload,
  Lock,
  CheckSquare,
  Globe,
  LayoutGrid,
  Grid3X3
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
  calculateMD5FromArrayBuffer,
  generateItemCode,
  checkImageHashExists,
  uploadImage,
  compressImage,
  loadCategoriesFromCloud,
  fetchSettings,
  saveSettings,
  uploadLogo,
  supabase
} from './services/supabaseService';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { PublicGallery } from './components/PublicGallery';
import { SettingsScreen } from './components/SettingsScreen';
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

const DEFAULT_TAGS: Tag[] = [];

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
      className={`relative aspect-square rounded-2xl overflow-hidden group shadow-sm active:scale-95 transition-all ring-offset-2 will-change-transform ${isSelected ? 'ring-2 ring-[#D4A853]' : 'bg-white'}`}
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
        <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-xl text-[8px] text-white font-black tracking-widest flex items-center gap-1 border border-white/20 uppercase">
          <Layers size={10} />
          {photo.groupId}
        </div>
      )}

      {isGroupMaster && groupCount > 1 && (
        <div className="absolute top-3 right-3 bg-[#D4A853] px-2 py-1 rounded-xl text-[10px] text-white font-black shadow-lg ring-1 ring-white/30">
          {groupCount}
        </div>
      )}

      {isMultiSelect && !isGroupMaster && (
        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all ${isSelected ? 'bg-[#1D3557] text-white' : 'bg-white/40 backdrop-blur-sm border border-white/50'}`}>
          {isSelected && <Check size={14} strokeWidth={4} />}
        </div>
      )}
      
      {photo.isAnalyzing && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-[#FDFAF6]/60 backdrop-blur-sm flex flex-col justify-center items-center cursor-default"
        >
          <div className="w-6 h-6 border-2 border-[#1D3557]/20 border-t-[#1D3557] rounded-full animate-spin mb-1"></div>
          <span className="text-[9px] text-[#1D3557] font-black tracking-widest uppercase opacity-40">Recognizing</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 translate-y-1 group-hover:translate-y-0 transition-transform">
        <p className="text-[9px] text-white/90 font-bold tracking-wider truncate uppercase mb-0.5">
          {categoryName}
        </p>
      </div>
    </motion.div>
  );
});

export default function App() {
  // --- State ---
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [dbCategories, setDbCategories] = useState<DB_Category[]>([]);
  const appLang = 'zh';
  const [publicPhotos, setPublicPhotos] = useState<Photo[]>([]);
  const [publicCategories, setPublicCategories] = useState<Category[]>([]);
  const [publicTags, setPublicTags] = useState<Tag[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<SubCategory[]>([]);
  const [viewMode, setViewMode] = useState<'public' | 'private'>('public');
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [manufacturers, setManufacturers] = useState<SubCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [isInitializing, setIsInitializing] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        try {
            const url = await uploadLogo(e.target.files[0]);
            const newSettings = { ...settings, logo_url: url };
            setSettings(newSettings);
            await saveSettings({
              ...newSettings,
              categories,
              tags,
              manufacturers
            });
            setAlertDialog({ title: '上傳成功', message: '品牌 Logo 已更新' });
        } catch (err: any) {
            console.error("Logo upload failed:", err);
            setAlertDialog({ title: '上傳失敗', message: err.message || '請檢查網路連線或儲存空間權限' });
        }
    }
  }

  const handleManageClick = () => {
    if (user) {
      setActiveScreen('manage');
    } else {
      setShowManageAccess(true);
    }
  };

  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAction, setSyncAction] = useState<'push' | 'pull' | 'idle'>('idle');
  const [syncPercent, setSyncPercent] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
  // Navigation & UI State
  const [activeScreen, setActiveScreen] = useState<'home' | 'add' | 'manage' | 'settings'>('home');
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [filterSubId, setFilterSubId] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  
  // Selection & Preview
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
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
  const [addName, setAddName] = useState('');
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
  const [internalPassword, setInternalPassword] = useState<string>(() => localStorage.getItem('internal_password') || '');
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{ title: string, message: string } | null>(null);

  // Custom Prompt Dialog State
  const [promptDialog, setPromptDialog] = useState<{ title: string, placeholder: string, onSubmit: (val: string) => void } | null>(null);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    // Initial fast load from Local Storage
    const initFastLoad = async () => {
      const [t, c, m, p, sp, sc, stg, sm, st] = await Promise.all([
        loadData('product_tags'),
        loadData('product_categories'),
        loadData('product_manufacturers'),
        loadData('product_photos'),
        loadData('public_photos'),
        loadData('public_categories'),
        loadData('public_tags'),
        loadData('public_manufacturers'),
        loadData('last_sync_time')
      ]);
      if (t && t.length > 0) setTags(t);
      if (c && c.length > 0) setCategories(c);
      if (m && m.length > 0) setManufacturers(m);
      if (p && p.length > 0) setPhotos(p);
      if (sp && sp.length > 0) setPublicPhotos(sp);
      if (sc && sc.length > 0) setPublicCategories(sc);
      if (stg && stg.length > 0) setPublicTags(stg);
      if (sm && sm.length > 0) setPublicManufacturers(sm);
      if (st) setLastSyncTime(st);
      
      // After local load, sync with cloud
      refreshCloudData(true);
    };
    initFastLoad();
    
    // Auth and sync listener
    const unsubscribe = onAuthChange(async (u) => {
      setUser(u);
      setViewMode(u ? 'private' : 'public');
      // Refresh count/state when user changes
      refreshCloudData(true);
    });

    loadCategoriesFromCloud().then(setDbCategories);
    return () => unsubscribe();
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
    }, 10000); 
    return () => clearInterval(timer);
  }, []);

  const [expandedCat, setExpandedCat] = useState<string | null>(null);

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshCloudData = async (force = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch Settings (Categories & Tags mapping are here)
      const cloudSettings = await fetchSettings();
      if (cloudSettings) {
        setSettings(cloudSettings);
        
        // Sync theme
        if (cloudSettings.background_color) document.documentElement.style.setProperty('--custom-bg', cloudSettings.background_color);
        if (cloudSettings.primary_color) document.documentElement.style.setProperty('--custom-text', cloudSettings.primary_color);
        if (cloudSettings.accent_color) document.documentElement.style.setProperty('--custom-accent', cloudSettings.accent_color);
        
        // Strict mapping sync: treat cloud as source of truth for PUBLIC view
        // Only overwrite public state
        if (cloudSettings.categories !== undefined) {
          setPublicCategories(cloudSettings.categories);
          saveData('public_categories', cloudSettings.categories);
        }
        
        if (cloudSettings.tags !== undefined) {
          setPublicTags(cloudSettings.tags);
          saveData('public_tags', cloudSettings.tags);
        }
        
        if (cloudSettings.manufacturers !== undefined) {
          setPublicManufacturers(cloudSettings.manufacturers);
          saveData('public_manufacturers', cloudSettings.manufacturers);
        }
      }

      // 2. Fetch DB Categories (new flat table)
      const cloudDbCats = await loadCategoriesFromCloud();
      if (cloudDbCats) {
        setDbCategories(cloudDbCats);
      }

      // 3. Fetch Public Photos
      const cloudPublicPhotos = await loadAllPhotosFromCloud();
      if (cloudPublicPhotos) {
        setPublicPhotos(cloudPublicPhotos);
        await saveData('public_photos', cloudPublicPhotos);
      }

      // 3. Fetch Cloud Count for admin if user logged in
      if (user) {
        const cloudPhotos = await loadPhotosFromCloud(user.id);
        if (cloudPhotos) {
          setCloudCount(cloudPhotos.length);
        }
      }
    } catch (err) {
      console.error("Cloud synchronization failed:", err);
    } finally {
      setIsRefreshing(false);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'public' && !isInitializing) {
      refreshCloudData();
    }
  }, [viewMode]);

  useEffect(() => {
    if ((activeScreen === 'settings' || activeScreen === 'manage') && user) {
      console.log("Fetching cloud count for user:", user.id);
      loadPhotosFromCloud(user.id)
        .then(data => {
          setCloudCount(data ? data.length : 0);
        })
        .catch(err => {
          console.error("Failed to fetch cloud count", err);
          setCloudCount(null);
        });
    }
  }, [activeScreen, user]);

  useEffect(() => {
    if (isInitializing) return;
    const persist = async () => {
      // Local Backup
      await saveData('product_photos', photos);
      await saveData('product_categories', categories);
      await saveData('product_tags', tags);
      await saveData('product_manufacturers', manufacturers);
    };
    persist();
  }, [photos, categories, tags, manufacturers, isInitializing, user]);

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
            const newNames = result.newTagName.split(',').map((s: string) => s.trim()).filter(Boolean);
            const newTagsToAdd: Tag[] = [];
            const newTagIds: string[] = [];
            
            newNames.forEach((name: string) => {
              const id = crypto.randomUUID();
              newTagsToAdd.push({ id, name, aliases: [] });
              newTagIds.push(id);
            });
            
            if (newTagsToAdd.length > 0) {
              setTags(prev => [...prev, ...newTagsToAdd]);
              finalTagIds = Array.from(new Set([...finalTagIds, ...newTagIds]));
            }
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

    // Local set to track hashes in this session to prevent duplicates between chunks
    const sessionHashes = new Set<string>();

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

          // Check raw Hash first using ArrayBuffer (robust & fast)
          const arrayBuffer = await file.arrayBuffer();
          const rawHash = calculateMD5FromArrayBuffer(arrayBuffer);
          
          const isLocalRawDuplicate = photosRef.current.some(p => p.image_hash === rawHash) || 
                                     sessionHashes.has(rawHash);
          
          if (isLocalRawDuplicate) {
            console.log(`Skipping duplicate (raw hash match): ${file.name}`);
            continue;
          }

          const compressedUri = await compressImage(rawUri);
          const imgHash = calculateMD5(compressedUri);

          const isLocalDuplicate = photosRef.current.some(p => p.image_hash === imgHash) || 
                                   sessionHashes.has(imgHash);

          if (isLocalDuplicate) {
            console.log(`Skipping duplicate (compressed hash match): ${file.name}`);
            continue;
          }
          
          if (user) {
            // Updated signature: only takes hash
            const existingInfo = await checkImageHashExists(imgHash);
            if (existingInfo) {
              setAlertDialog({ 
                title: '圖片重複', 
                message: `照片「${file.name}」在雲端已存在相同內容（編號：${existingInfo.manual_code || '無'}），系統已自動跳過此照片以節省空間。` 
              });
              continue;
            }
          }

          // Mark as processed in this session
          sessionHashes.add(rawHash);
          sessionHashes.add(imgHash);

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
                  const newNames = result.newTagName.split(',').map((s: string) => s.trim()).filter(Boolean);
                  const newTagsToAdd: Tag[] = [];
                  const newTagIds: string[] = [];
                  
                  newNames.forEach((name: string) => {
                    const id = crypto.randomUUID();
                    newTagsToAdd.push({ id, name, aliases: [] });
                    newTagIds.push(id);
                  });
                  
                  if (newTagsToAdd.length > 0) {
                    setTags(prev => [...prev, ...newTagsToAdd]);
                    finalTagIds = Array.from(new Set([...finalTagIds, ...newTagIds]));
                  }
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
        setPhotos(prev => {
          const next = [...newPhotosDraft, ...prev];
          photosRef.current = next;
          return next;
        });
        // Small delay to allow UI to render and JS engine to breathe
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    setIsImporting(false);
  };

  const saveNewPhoto = async () => {
    if (!newPhotoData && !editPhotoId) return;
    
    setIsSyncing(true); // Reuse sync state as general loading indicator
    setSyncAction('idle');
    setSyncPercent(30);

    try {
      const selectedDbCat = dbCategories.find(c => c.code === addCatId);
      const catCode = selectedDbCat?.code || addCatId || 'others';
      
      const subName = categories.find(c => c.id === addCatId)?.subcategories.find(s => s.id === addSubId)?.name || '';
      const tagNames = tags.filter(t => addTagIds.includes(t.id)).map(t => t.name);
      
      const currentPhoto = editPhotoId ? photos.find(p => p.id === editPhotoId) : null;
      // Only compress if it's a NEW photo or the photo data changed from the original uri
      const isPhotoChanged = newPhotoData && (!currentPhoto || newPhotoData !== currentPhoto.uri);
      
      setSyncPercent(60);
      const compressedData = isPhotoChanged ? await compressImage(newPhotoData!) : null;
      const imgHash = compressedData ? calculateMD5(compressedData) : (currentPhoto?.image_hash || '');
      
      if (editPhotoId && currentPhoto) {
        const updatedPhoto: Photo = {
          ...currentPhoto,
          ...(compressedData ? { uri: compressedData, image_hash: imgHash } : {}),
          name: addName || currentPhoto.name || '家具紀錄',
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
        };

        setPhotos(prev => prev.map(p => p.id === editPhotoId ? updatedPhoto : p));
        
        if (user) {
          await savePhotoToCloud(user.id, updatedPhoto);
        }
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
          const existingInfo = await checkImageHashExists(imgHash);
          if (existingInfo) {
            setAlertDialog({ 
              title: '提示', 
              message: `照片已存在！\n編號：${existingInfo.manual_code || '無'}` 
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
          name: addName || '新家具紀錄',
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
    } finally {
      setIsSyncing(false);
      setSyncPercent(0);
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
    setAddName('');
    setAddManualCode('');
    setAddDimL('');
    setAddDimW('');
    setAddDimH('');
    setShowOtherFields(false);
  };

  const saveBatchEdit = async () => {
    if (!batchEditIds) return;
    // Allow saving if either a category is selected OR at least one tag is selected OR a manual code is set OR dimensions OR note
    if (!addCatId && addTagIds.length === 0 && !addManualCode && !addNote && !addDimL && !addDimW && !addDimH) return;

    setIsSyncing(true);
    setSyncPercent(20);

    try {
      const updatedPhotos: Photo[] = [];
      const newPhotosList = photos.map(p => {
        if (!batchEditIds.includes(p.id)) return p;
        
        const newCatId = addCatId || p.categoryId;
        const newSubId = addSubId || p.subcategoryId;
        const newTagIds = (addTagIds && addTagIds.length > 0) ? addTagIds : (p.tagIds || []);
        
        const dbCat = dbCategories.find(c => c.code === newCatId);
        const catCode = dbCat?.code || newCatId || 'others';
        
        const subName = categories.find(c => c.id === newCatId)?.subcategories.find(s => s.id === newSubId)?.name || (newSubId === p.subcategoryId ? p.sub_category : '');
        const tagNames = tags.filter(t => newTagIds.includes(t.id)).map(t => t.name);

        const updated: Photo = {
          ...p,
          categoryId: newCatId,
          subcategoryId: newSubId,
          tagIds: newTagIds,
          category: catCode,
          sub_category: subName,
          tags: tagNames,
          description: addNote || p.description,
          manual_code: addManualCode || p.manual_code,
          dimensions: (addDimL || addDimW || addDimH) ? {
            length: Number(addDimL) || p.dimensions?.length || 0,
            width: Number(addDimW) || p.dimensions?.width || 0,
            height: Number(addDimH) || p.dimensions?.height || 0,
            unit: 'cm'
          } : p.dimensions
        };
        updatedPhotos.push(updated);
        return updated;
      });

      setPhotos(newPhotosList);
      
      if (user) {
        // Sync one by one or chunked
        for (let i = 0; i < updatedPhotos.length; i++) {
          setSyncPercent(20 + Math.round((i / updatedPhotos.length) * 80));
          await savePhotoToCloud(user.id, updatedPhotos[i]);
        }
      }
      
      resetAddState();
      setIsMultiSelect(false);
      setSelectedIds([]);
    } catch (err: any) {
      console.error("Batch save failed:", err);
      setAlertDialog({ title: '保存失敗', message: err.message || '請檢查網路' });
    } finally {
      setIsSyncing(false);
      setSyncPercent(0);
    }
  };

  const togglePhotoSelection = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id];
    if (next.length === 0) setIsMultiSelect(false);
    setSelectedIds(next);
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
    <header className="shrink-0 z-50 bg-[#FDFAF6] px-6 py-4 flex items-center justify-between gap-4 sticky top-0 pt-safe">
      <div className="flex-1 min-w-0">
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="h-10 max-w-[180px] object-contain rounded-xl border border-[#1D3557]/10 p-1 bg-white shadow-sm" />
        ) : (
          <h1 className="text-xl font-black tracking-tighter text-[#1D3557] border border-[#1D3557]/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none">MANAGEMENT</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!user ? (
          <button 
            onClick={async () => {
              try {
                await loginWithGoogle();
              } catch(e: any) {
                alert('登入失敗: ' + (e.message || JSON.stringify(e)));
              }
            }}
            className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#1D3557] text-[#FDFAF6] shadow-sm active:scale-95 transition-all flex items-center gap-2"
          >
            <LogIn size={14} />
            LOGIN
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#1D3557]/5 p-1 rounded-2xl border border-[#1D3557]/10">
            <button 
              onClick={() => setViewMode(viewMode === 'public' ? 'private' : 'public')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === 'public' ? 'bg-[#D4A853] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
              title="切換公開頁面"
            >
              <Globe size={18} />
            </button>

            {viewMode === 'private' && (
              <>
                <button 
                  onClick={handleBatchAiIdentify}
                  disabled={isBatchAnalyzing}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isBatchAnalyzing ? 'bg-[#1D3557] text-white' : 'text-purple-600/50 hover:text-purple-600'}`}
                  title="AI 批量辨識"
                >
                  {isBatchAnalyzing ? (
                    <span className="animate-pulse text-[9px] font-bold">{batchProgress.current}</span>
                  ) : (
                    <Sparkles size={18} />
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
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isMultiSelect ? 'bg-[#1D3557] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                  title="多選模式"
                >
                  <CheckSquare size={18} />
                </button>

                <button 
                  onClick={handleManageClick}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeScreen === 'manage' ? 'bg-[#1D3557] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                  title="設定與管理"
                >
                  <Settings2 size={18} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );

  const renderFloatingActionButton = () => (
    viewMode === 'private' && (
      <label className="fixed bottom-8 right-8 w-14 h-14 bg-[#1D3557] text-white rounded-[28px] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all z-[100] cursor-pointer border border-white/20">
        <Plus size={28} />
        <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoImport} />
      </label>
    )
  );

  const renderSearchAndFilter = () => (
    <div className="bg-[#FDFAF6] border-b border-[#1D3557]/5 px-6 py-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D3557]/30 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="搜尋產品..."
            className="w-full bg-white/60 border border-[#1D3557]/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:bg-white transition-all outline-none text-[#1D3557] placeholder-[#1D3557]/30 shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1D3557]/30 hover:text-[#1D3557]/60 p-1">
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          onClick={() => setDisplayMode(displayMode === 'grid' ? 'list' : 'grid')}
          className="w-10 h-10 rounded-2xl border transition-all flex items-center justify-center bg-white border-[#1D3557]/10 text-[#1D3557]/40 hover:text-[#1D3557] shadow-sm active:scale-95"
          title={displayMode === 'grid' ? "切換至大圖" : "切換至網格"}
        >
          {displayMode === 'grid' ? <LayoutGrid size={18} /> : <Grid3X3 size={18} />}
        </button>
        <button 
          onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
          className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm active:scale-95 ${showGroupsCollapsed ? 'bg-[#1D3557] border-[#1D3557] text-white' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/50 hover:text-[#1D3557]'}`}
          title={showGroupsCollapsed ? "展开群组" : "合併群組"}
        >
          <Layers size={18} />
        </button>
      </div>

      {/* Directory Row 1: Main Categories */}
      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => { setFilterCatId(null); setFilterSubId(null); }}
          className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${!filterCatId ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
        >
          全部产品
        </button>
        {dbCategories.map(cat => (
          <button 
            key={cat.code}
            onClick={() => { setFilterCatId(cat.code); setFilterSubId(null); }}
            className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${filterCatId === cat.code ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
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
            className="space-y-3 overflow-hidden"
          >
            {/* Directory Row 2: Sub-categories (Conditional) */}
            {filterCatId && (
              <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar">
                <button 
                  onClick={() => setFilterSubId(null)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${!filterSubId ? 'bg-[#D4A853] border-[#D4A853] text-white shadow-md' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium'}`}
                >
                  ALL
                </button>
                {(() => {
                  const legacyMatchedCat = categories.find(c => c.name === dbCategories.find(dc => dc.code === filterCatId)?.zh || c.id === filterCatId);
                  return legacyMatchedCat?.subcategories.map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => setFilterSubId(sub.id)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest whitespace-nowrap border transition-all ${filterSubId === sub.id ? 'bg-[#D4A853] border-[#D4A853] text-white shadow-md' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium hover:text-[#1D3557]/60'}`}
                    >
                      {sub.name}
                    </button>
                  ));
                })()}
              </div>
            )}
            
            <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar scroll-smooth px-1">
              {tags.map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => setFilterTagIds(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${filterTagIds.includes(tag.id) ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white/40 border-[#1D3557]/10 text-[#1D3557]/40 hover:bg-white'}`}
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
        <div className={`grid gap-3 ${displayMode === 'grid' ? 'grid-cols-3' : 'grid-cols-1'}`}>
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
                  if (dbCat) {
                    const name = dbCat[appLang] || dbCat.zh;
                    const isUncat = (n: string) => ['未分类', '未分類', 'uncategorized', 'others'].includes(n.toLowerCase());
                    return isUncat(name) ? undefined : name;
                  }
                  const legacyCat = categories.find(c => c.id === photo.categoryId);
                  const legacyName = legacyCat?.name;
                  const isUncategorized = (n: string) => 
                    ['未分类', '未分類', 'uncategorized', 'Uncategorized', 'others', 'Others'].includes(n.toLowerCase());
                  
                  if (legacyName && !isUncategorized(legacyName)) return legacyName;
                  if (code && !isUncategorized(code)) return code;
                  return undefined;
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
                  setAddTagIds(photo.tagIds || []);
                  setAddNote(photo.description || '');
                  setAddName(photo.name || '');
                  setAddManualCode(photo.manual_code || '');
                  setAddDimL(photo.dimensions?.length?.toString() || '');
                  setAddDimW(photo.dimensions?.width?.toString() || '');
                  setAddDimH(photo.dimensions?.height?.toString() || '');
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
                   <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-active:scale-90 transition-transform">
                     <Settings2 size={20} />
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
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <X size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight">批量修改 ({batchEditIds?.length})</h2>
        <button 
          onClick={() => {
            if (!addCatId && addTagIds.length === 0 && !addManualCode && !addNote && !addDimL && !addDimW && !addDimH) {
              setAlertDialog({ title: '提示', message: "請輸入或修改任一欄位內容" });
              return;
            }
            saveBatchEdit();
          }}
          className={`bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : null}
          套用修改
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl">
          <p className="text-[11px] text-blue-700 font-medium leading-relaxed flex items-start gap-2">
            <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
            注意：這會更新所有選中照片。僅手動修改的欄位會被套用至所有選取項目。
          </p>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目標主分類 *</h3>
          <div className="grid grid-cols-2 gap-3">
            {dbCategories.map(cat => (
              <button 
                key={cat.code}
                onClick={() => { setAddCatId(cat.code); setAddSubId(null); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${addCatId === cat.code ? 'bg-white border-blue-600 text-blue-600 shadow-xl shadow-blue-600/5' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
              >
                <span className="font-bold block text-sm tracking-tight">{cat[appLang] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">{cat.en}</span>
              </button>
            ))}
          </div>
        </section>

        <AnimatePresence mode="wait">
          {addCatId && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目標子分類</h3>
                <button onClick={quickAddSubCategory} className="text-[10px] text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
              </div>
              <div className="flex flex-wrap gap-2 p-1">
                {categories.find(c => c.id === addCatId)?.subcategories.map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => setAddSubId(sub.id)}
                    className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addSubId === sub.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一風格標籤</h3>
            <button onClick={quickAddTag} className="text-[10px] text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {tags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => setAddTagIds(prev => prev.includes(tag.id) ? prev.filter(tid => tid !== tag.id) : [...prev, tag.id])}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addTagIds.includes(tag.id) ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一產品備註</h3>
            <textarea 
              placeholder="輸入統一修改的備註內容..."
              className="w-full bg-slate-100/50 border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium min-h-[100px]"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
            />
        </section>

        <section className="space-y-4">
          <button 
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${showOtherFields ? 'rotate-90' : ''}`}>
                <ChevronRight size={16} />
              </div>
              <span>其他詳細資訊 (編號、尺寸)</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          </button>

          <AnimatePresence>
            {showOtherFields && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 pt-2"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">統一產品編號</label>
                  <input 
                    type="text" 
                    placeholder="輸入編號 (例如: SK-2024)..."
                    value={addManualCode}
                    onChange={(e) => setAddManualCode(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 p-4 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">統一尺寸 (長 x 寬 x 高) cm</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input 
                      type="number"
                      placeholder="長"
                      value={addDimL}
                      onChange={(e) => setAddDimL(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="寬"
                      value={addDimW}
                      onChange={(e) => setAddDimW(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="高"
                      value={addDimH}
                      onChange={(e) => setAddDimH(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
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
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={() => { resetAddState(); setActiveScreen('home'); }} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <X size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight">{editPhotoId ? '編輯產品' : '產品入庫'}</h2>
        <div className="flex items-center gap-2">
          {!editPhotoId && newPhotoData && (
            <button 
              onClick={handleSingleAiAnalyze}
              disabled={isAnalyzing}
              className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm active:scale-90 ${isAnalyzing ? 'bg-purple-100 border-purple-200' : 'bg-white border-slate-200 hover:bg-purple-50 text-purple-600'}`}
              title="AI 辨識"
            >
              {isAnalyzing ? <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={20} />}
            </button>
          )}
          {editPhotoId && (
            <button 
              onClick={() => deletePhoto(editPhotoId)}
              className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-all active:scale-90"
              title="刪除照片"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={saveNewPhoto}
            disabled={isSyncing}
            className={`bg-slate-800 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-slate-800/10 transition-all active:scale-95 flex items-center gap-2 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : null}
            完成儲存
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <div className="aspect-[4/3] rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center border-4 border-white">
          {newPhotoData && <img src={newPhotoData} className="max-w-full max-h-full object-contain" alt="New" />}
        </div>

        <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">家具名稱 (AI 自動或手寫)</h3>
            <input 
              type="text" 
              placeholder="輸入家具名稱..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm font-bold placeholder:text-slate-300"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">選擇主分類 *</h3>
          <div className="grid grid-cols-2 gap-3">
            {dbCategories.map(cat => (
              <button 
                key={cat.code}
                onClick={() => { setAddCatId(cat.code); setAddSubId(null); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${addCatId === cat.code ? 'bg-white border-slate-800 text-slate-800 shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
              >
                <span className="font-bold block text-sm tracking-tight">{cat[appLang] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">{cat.en}</span>
              </button>
            ))}
          </div>
        </section>

        <AnimatePresence mode="wait">
          {addCatId && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">細分子分類</h3>
                <button onClick={() => quickAddSubCategory()} className="text-[10px] text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
              </div>
              <div className="flex flex-wrap gap-2 p-1">
                {categories.find(c => c.id === addCatId)?.subcategories.map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => setAddSubId(sub.id)}
                    className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addSubId === sub.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">風格標籤</h3>
          <div className="flex flex-wrap gap-2 p-1">
            {tags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => setAddTagIds(prev => prev.includes(tag.id) ? prev.filter(tid => tid !== tag.id) : [...prev, tag.id])}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addTagIds.includes(tag.id) ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                #{tag.name}
              </button>
            ))}
            <button onClick={quickAddTag} className="px-4 py-2 rounded-full border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-2 font-bold hover:border-slate-400 hover:text-slate-600 active:scale-95 transition-all">
              <Plus size={14} /> 新增自定義
            </button>
          </div>
        </section>

        <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">產品說明 / 備註</h3>
            <textarea 
              placeholder="輸入產品特色、說明或注意事項..."
              className="w-full bg-slate-100/50 border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium placeholder:text-slate-400 min-h-[120px]"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
            />
        </section>

        <section className="space-y-4">
          <button 
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${showOtherFields ? 'rotate-90' : ''}`}>
                <ChevronRight size={16} />
              </div>
              <span>其他詳細資訊 (編號、尺寸)</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          </button>

          <AnimatePresence>
            {showOtherFields && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 pt-2"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">產品編號</label>
                  <input 
                    type="text" 
                    placeholder="輸入編號 (例如: SK-2024)..."
                    value={addManualCode}
                    onChange={(e) => setAddManualCode(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 p-4 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono tracking-tight">家具規格尺寸 (長 x 寬 x 高) cm</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input 
                      type="number"
                      placeholder="長"
                      value={addDimL}
                      onChange={(e) => setAddDimL(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="寬"
                      value={addDimW}
                      onChange={(e) => setAddDimW(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="高"
                      value={addDimH}
                      onChange={(e) => setAddDimH(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );

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

  const handleSingleAiAnalyze = async () => {
    if (!newPhotoData) return;
    
    // Check key
    const effectiveKey = geminiApiKey;
    if (!effectiveKey) {
      setAlertDialog({ title: '需要 API 金鑰', message: '請先在設定中設定相容的 API 金鑰 (Gemini, Groq, OpenRouter 或 GitHub Models)。' });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeProductPhoto(newPhotoData, categories, tags, effectiveKey, aiProvider, customModel);
      
      if (result.categoryId) setAddCatId(result.categoryId);
      if (result.subcategoryId) setAddSubId(result.subcategoryId);
      
      if (result.newCategoryName) {
        const catName = result.newCategoryName.trim();
        const existingCat = categories.find(c => c.name === catName);
        if (existingCat) {
          setAddCatId(existingCat.id);
        } else {
          const newId = crypto.randomUUID();
          const newCat: Category = {
            id: newId,
            name: catName,
            aliases: [catName],
            subcategories: []
          };
          const updatedCats = [...categories, newCat];
          setCategories(updatedCats);
          setAddCatId(newId);
          
          if (user) {
            saveSettings({
              ...settings,
              categories: updatedCats,
              tags,
              manufacturers
            });
          }
        }
      }

      if (result.tagIds) setAddTagIds(result.tagIds);
      if (result.name) {
        setAddName(result.name);
      }
      if (result.description) {
        setAddNote(result.description);
      }
      if (result.newTagName) {
        const newNames = result.newTagName.split(',').map((s: string) => s.trim()).filter(Boolean);
        const newTagsToAdd: Tag[] = [];
        const newTagIds: string[] = [];
        
        newNames.forEach((name: string) => {
          const id = crypto.randomUUID();
          newTagsToAdd.push({ id, name, aliases: [] });
          newTagIds.push(id);
        });
        
        if (newTagsToAdd.length > 0) {
          const updatedTags = [...tags, ...newTagsToAdd];
          setTags(updatedTags);
          setAddTagIds(prev => Array.from(new Set([...prev, ...newTagIds])));
          
          if (user) {
            saveSettings({
              ...settings,
              categories,
              tags: updatedTags,
              manufacturers
            });
          }
        }
      }
      
      // Auto-set additional fields if they are empty
      if (result.dimensions) {
        if (!addDimL) setAddDimL(String(result.dimensions.length || ''));
        if (!addDimW) setAddDimW(String(result.dimensions.width || ''));
        if (!addDimH) setAddDimH(String(result.dimensions.height || ''));
      }
      
    } catch (err: any) {
      console.error("AI error:", err);
      setAlertDialog({ title: '辨識失敗', message: err.message || '無法辨識此照片' });
    } finally {
      setIsAnalyzing(false);
    }
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
    return renderSettingsScreen();
  };

  const triggerManualSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncPercent(0);
    try {
      await syncPhotosToCloud(user.id, photos, (p) => setSyncPercent(Math.round(p)));
      
      // Sync master settings as well during manual sync
      await saveSettings({
        ...settings,
        categories: categories,
        tags: tags,
        manufacturers: manufacturers
      });

      const cloudPhotos = await loadPhotosFromCloud(user.id);
      if (cloudPhotos) {
        setPhotos(cloudPhotos);
        setCloudCount(cloudPhotos.length);
        await saveData('product_photos', cloudPhotos);
      }
      const now = Date.now();
      setLastSyncTime(now);
      await saveData('last_sync_time', now);
      alert('同步成功');
    } catch (e: any) {
      const msg = e?.message || e?.details || JSON.stringify(e);
      alert('同步失敗: ' + msg);
    } finally {
      setIsSyncing(false);
      setSyncPercent(0);
    }
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
          
          // CRITICAL: Also sync master settings (Categories, Tags, Manufacturers)
          await saveSettings({
            ...settings,
            categories: categories,
            tags: tags,
            manufacturers: manufacturers
          });

          // NEW: Performing deduplication per user as requested
          console.log("Running deduplication...");
          const { deduplicatePhotos } = await import('./services/supabaseService');
          const dedupResult = await deduplicatePhotos(user.id);
          if (dedupResult.removed > 0) {
            console.log(`Deduplication removed ${dedupResult.removed} duplicate records for user.`);
          }

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
        } catch (e: any) {
          console.error(e);
          const msg = e?.message || e?.details || JSON.stringify(e);
          alert('同步發生錯誤: ' + msg);
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
          const cloudSettings = await fetchSettings();
          
          if (cloudPhotos) {
            setPhotos(cloudPhotos);
            setCloudCount(cloudPhotos.length);
            await saveData('product_photos', cloudPhotos);
          }

          if (cloudSettings) {
            setSettings(cloudSettings);
            // Overwrite categories, tags, and manufacturers from cloud
            setCategories(cloudSettings.categories || []);
            await saveData('product_categories', cloudSettings.categories || []);
            
            setTags(cloudSettings.tags || []);
            await saveData('product_tags', cloudSettings.tags || []);
            
            setManufacturers(cloudSettings.manufacturers || []);
            await saveData('product_manufacturers', cloudSettings.manufacturers || []);
          }
          
          const now = Date.now();
          setLastSyncTime(now);
          await saveData('last_sync_time', now);
          
          alert('下載並同步成功');
        } catch (e: any) {
          console.error(e);
          const msg = e?.message || e?.details || JSON.stringify(e);
          alert(`下載失敗: ${msg}`);
        } finally {
          setIsSyncing(false);
          setSyncAction('idle');
          setSyncPercent(0);
        }
      }
    });
  };

  const handleSetTags = (val: React.SetStateAction<Tag[]>) => {
    setTags(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveData('product_tags', next);
      return next;
    });
  };

  const handleSetCategories = (val: React.SetStateAction<Category[]>) => {
    setCategories(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveData('product_categories', next);
      return next;
    });
  };

  const handleSetManufacturers = (val: React.SetStateAction<SubCategory[]>) => {
    setManufacturers(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveData('product_manufacturers', next);
      return next;
    });
  };

  const renderSettingsScreen = () => {
    return (
      <SettingsScreen 
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        settings={settings}
        setSettings={setSettings}
        saveSettings={saveSettings}
        manufacturers={manufacturers}
        setManufacturers={handleSetManufacturers}
        tags={tags}
        setTags={handleSetTags}
        user={user}
        loginWithGoogle={loginWithGoogle}
        logout={logout}
        triggerManualSync={triggerManualSync}
        isSyncing={isSyncing}
        syncPercent={syncPercent}
        handleLogoUpload={handleLogoUpload}
        setCategories={handleSetCategories}
        categories={categories}
        dbCategories={dbCategories}
        performPushSync={performPushSync}
        performPullSync={performPullSync}
        cloudCount={cloudCount}
        lastSyncTime={lastSyncTime}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        customModel={customModel}
        setCustomModel={setCustomModel}
        internalPassword={internalPassword}
        setInternalPassword={setInternalPassword}
        photos={photos}
        setPhotos={setPhotos}
      />
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
                            {dbCategories.map(cat => {
                              const isAllMatch = groupPhotos.length > 0 && groupPhotos.every(p => p.category === cat.code);
                              return (
                                <button 
                                  key={cat.code}
                                  onClick={() => setPhotos(prev => prev.map(p => p.groupId === activeGroupId ? { ...p, category: cat.code, categoryId: cat.code, subcategoryId: null, sub_category: '' } : p))}
                                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm ${isAllMatch ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 active:bg-slate-50'}`}
                                >
                                  {cat[appLang] || cat.zh}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {groupPhotos.length > 0 && groupPhotos.every(p => p.category === groupPhotos[0].category) && groupPhotos[0].category && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                          >
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter ml-1">子分類套用</p>
                            <div className="flex flex-wrap gap-2">
                              {categories.find(c => c.id === groupPhotos[0].category)?.subcategories.map(sub => {
                                const isAllMatch = groupPhotos.every(p => p.subcategoryId === sub.id);
                                return (
                                  <button 
                                    key={sub.id}
                                    onClick={() => setPhotos(prev => prev.map(p => p.groupId === activeGroupId ? { ...p, subcategoryId: sub.id, sub_category: sub.name } : p))}
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
        <div className={`flex-1 relative flex flex-col ${viewMode === 'public' ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'}`}>
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
                  categories={publicCategories}
                  tags={publicTags}
                  dbCategories={dbCategories}
                  showExit={!!user} 
                  onExit={() => setViewMode('private')} 
                  internalPassword={internalPassword}
                  onLogin={() => setShowManageAccess(true)}
                  settings={settings}
                  isRefreshing={isRefreshing}
                  onRefresh={() => refreshCloudData(true)}
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
      
      {/* Manage Access Dialog */}
      {showManageAccess && (
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
              <h3 className="font-bold text-lg">登入</h3>
              <div className="relative">
                <input 
                  autoFocus
                  type="password" 
                  placeholder="輸入管理密碼" 
                  className="w-full border p-4 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.currentTarget.value === internalPassword) {
                        setActiveScreen('manage');
                        setShowManageAccess(false);
                      } else {
                        alert('密碼錯誤');
                      }
                    }
                  }}
                />
              </div>
              <button onClick={() => setShowManageAccess(false)} className="w-full text-slate-500">取消</button>
              
              <button 
                onClick={async () => {
                  await loginWithGoogle();
                  setShowManageAccess(false);
                  setActiveScreen('manage');
                }}
                className="w-full text-slate-400 text-sm hover:text-slate-600"
              >
                Google 登入
              </button>
            </div>
          </div>
      )}

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
      {renderFloatingActionButton()}
    </div>
  );
}

