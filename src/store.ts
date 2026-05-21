import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storage } from '@/lib/storage'
import { globalHandleError as handleError } from '@/utils/errorHandler'
import { User, AppSettings } from '@/types'

// ========== 类型定义 ==========

// 只保留 UI 状态
interface UIState {
  filterCatId: string | null
  filterTagIds: string[]
  searchQuery: string
  activeGroupId: string | null
  isMultiSelect: boolean
  sidebarCollapsed: boolean
  selectedIds: string[]
  loadingType: 'none' | 'global' | 'local' | 'analyzing' | 'sync-pull' | 'sync-push'
  editPhotoId: string | null
  batchEditIds: string[] | null
  hasLoadedOnce: boolean
  alertDialog: any | null
  promptDialog: any | null
  language: 'zh' | 'en' | 'ms'
  tagStats: Record<string, number>
  filterSubId: string | null
  sortOrder: 'newest' | 'oldest' | 'name'
  isStaffMode: boolean
  showGroupsCollapsed: boolean
  viewMode: 'grid' | 'list'
  adminPreviewMode: 'public' | 'private'
  isSyncing: boolean
  activeScreen: 'gallery' | 'tags' | 'stats' | 'settings' | 'errors' | 'batch' | 'home' | 'manage' | 'login'
  isInfiniteMode: boolean
  geminiApiKey: string | null
  customModel: string | null
  accessPasscode: string | null
  settings: AppSettings | null
  user: User | null
  isAnalyzing: boolean
  aiDebugInfo: any | null
  errors: any[]
  appLang: 'zh' | 'en' | 'ms'
  debouncedSearchQuery: string
  tagIdToNameMap: Record<string, string>
}

interface UIActions {
  setFilterCatId: (id: string | null) => void
  setFilterTagIds: (idsOrFn: string[] | ((prev: string[]) => string[])) => void
  setSearchQuery: (query: string) => void
  setActiveGroupId: (id: string | null) => void
  setIsMultiSelect: (value: boolean) => void
  setSidebarCollapsed: (value: boolean) => void
  setSelectedIds: (idsOrFn: string[] | ((prev: string[]) => string[])) => void
  addSelectedPhotoId: (id: string) => void
  removeSelectedPhotoId: (id: string) => void
  toggleSelectedPhotoId: (id: string) => void
  clearSelectedPhotos: () => void
  resetFilters: () => void
  resetUI: () => void
  setLoadingType: (type: UIState['loadingType']) => void
  setEditPhotoId: (id: string | null) => void
  setBatchEditIds: (ids: string[] | null) => void
  setHasLoadedOnce: (hasLoaded: boolean) => void
  setAlertDialog: (dialog: any) => void
  setPromptDialog: (dialog: any) => void
  setLanguage: (lang: 'zh' | 'en' | 'ms') => void
  setTagStats: (stats: Record<string, number>) => void
  setFilterSubId: (id: string | null) => void
  setSortOrder: (order: UIState['sortOrder']) => void
  setIsStaffMode: (value: boolean) => void
  setShowGroupsCollapsed: (value: boolean) => void
  setViewMode: (mode: UIState['viewMode']) => void
  setAdminPreviewMode: (mode: UIState['adminPreviewMode']) => void
  setIsSyncing: (value: boolean) => void
  setActiveScreen: (screen: UIState['activeScreen']) => void
  setIsInfiniteMode: (value: boolean) => void
  setGeminiApiKey: (key: string | null) => void
  setCustomModel: (model: string | null) => void
  setAccessPasscode: (code: string | null) => void
  setSettings: (settings: AppSettings | null) => void
  setUser: (user: User | null) => void
  setIsAnalyzing: (value: boolean) => void
  setAiDebugInfo: (info: any) => void
  clearErrors: () => void
  setAppLang: (lang: UIState['appLang']) => void
  setDebouncedSearchQuery: (query: string) => void
  withLoading: <T>(type: UIState['loadingType'], fn: () => Promise<T>) => Promise<T>
}

export type StoreState = UIState & UIActions

// ========== 初始状态 ==========

const initialState: UIState = {
  filterCatId: null,
  filterTagIds: [],
  searchQuery: '',
  activeGroupId: null,
  isMultiSelect: false,
  sidebarCollapsed: false,
  selectedIds: [],
  loadingType: 'none',
  editPhotoId: null,
  batchEditIds: null,
  hasLoadedOnce: false,
  alertDialog: null,
  promptDialog: null,
  language: 'en',
  tagStats: {},
  filterSubId: null,
  sortOrder: 'newest',
  isStaffMode: false,
  showGroupsCollapsed: true,
  viewMode: 'grid',
  adminPreviewMode: 'private',
  isSyncing: false,
  activeScreen: 'gallery',
  isInfiniteMode: true,
  geminiApiKey: null,
  customModel: 'gemini-2.0-flash-exp',
  accessPasscode: null,
  settings: null,
  user: null,
  isAnalyzing: false,
  aiDebugInfo: null,
  errors: [],
  appLang: 'en',
  debouncedSearchQuery: '',
  tagIdToNameMap: {},
}

// ========== 白名单（只持久化这些）==========

const PERSIST_KEYS: (keyof UIState)[] = [
  'filterCatId',
  'filterTagIds',
  'searchQuery',
  'activeGroupId',
  'isMultiSelect',
  'sidebarCollapsed',
  'selectedIds',
  'language',
  'sortOrder',
  'showGroupsCollapsed',
  'viewMode',
  'isInfiniteMode',
  'geminiApiKey',
  'customModel',
  'accessPasscode',
  'appLang',
]

// ========== 创建 store ==========

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setFilterCatId: (id) => set({ filterCatId: id }),
      setFilterTagIds: (idsOrFn) => set((state) => ({ 
        filterTagIds: typeof idsOrFn === 'function' ? idsOrFn(state.filterTagIds) : idsOrFn 
      })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveGroupId: (id) => set({ activeGroupId: id }),
      setIsMultiSelect: (value) => set({ isMultiSelect: value }),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setSelectedIds: (idsOrFn) => set((state) => ({ 
        selectedIds: typeof idsOrFn === 'function' ? idsOrFn(state.selectedIds) : idsOrFn 
      })),
      setLoadingType: (type) => set({ loadingType: type }),
      setEditPhotoId: (id) => set({ editPhotoId: id }),
      setBatchEditIds: (ids) => set({ batchEditIds: ids }),
      setHasLoadedOnce: (hasLoaded) => set({ hasLoadedOnce: hasLoaded }),
      setAlertDialog: (dialog) => set({ alertDialog: dialog }),
      setPromptDialog: (dialog) => set({ promptDialog: dialog }),
      setLanguage: (lang) => set({ language: lang }),
      setTagStats: (stats) => set({ tagStats: stats }),
      setFilterSubId: (id) => set({ filterSubId: id }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setIsStaffMode: (value) => set({ isStaffMode: value }),
      setShowGroupsCollapsed: (value) => set({ showGroupsCollapsed: value }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setAdminPreviewMode: (mode) => set({ adminPreviewMode: mode }),
      setIsSyncing: (value) => set({ isSyncing: value }),
      setActiveScreen: (screen) => set({ activeScreen: screen }),
      setIsInfiniteMode: (value) => set({ isInfiniteMode: value }),
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setCustomModel: (model) => set({ customModel: model }),
      setAccessPasscode: (code) => set({ accessPasscode: code }),
      setSettings: (settings) => set({ settings }),
      setUser: (user) => set({ user }),
      setIsAnalyzing: (value) => set({ isAnalyzing: value }),
      setAiDebugInfo: (info) => set({ aiDebugInfo: info }),
      clearErrors: () => set({ errors: [] }),
      setAppLang: (lang) => set({ appLang: lang, language: lang }),
      setDebouncedSearchQuery: (query) => set({ debouncedSearchQuery: query }),

      addSelectedPhotoId: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds
          : [...state.selectedIds, id]
      })),

      removeSelectedPhotoId: (id) => set((state) => ({
        selectedIds: state.selectedIds.filter(i => i !== id)
      })),

      toggleSelectedPhotoId: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter(i => i !== id)
          : [...state.selectedIds, id]
      })),

      clearSelectedPhotos: () => set({ selectedIds: [] }),

      resetFilters: () => set({
        filterCatId: null,
        filterTagIds: [],
        searchQuery: '',
      }),

      resetUI: () => set({
        ...initialState,
        sidebarCollapsed: get().sidebarCollapsed, // 保留用户偏好
      }),

      withLoading: async (type, fn) => {
        set({ loadingType: type })
        try {
          return await fn()
        } catch (error) {
          handleError(error, 'withLoading')
          throw error
        } finally {
          set({ loadingType: 'none' })
        }
      },
    }),
    {
      name: 'photoX-ui-storage',
      version: 4,

      storage: {
        getItem: (name) => storage.get(name, null),
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.remove(name),
      },

      partialize: (state) => {
        const persisted: any = {}
        for (const key of PERSIST_KEYS) {
          persisted[key] = state[key]
        }
        return persisted
      },

      // 正确的迁移逻辑
      migrate: (persistedState: any, version) => {
        const old = persistedState as any
        const safeFilterTagIds = Array.isArray(old.filterTagIds) ? old.filterTagIds : []
        const safeSelectedIds = Array.isArray(old.selectedIds) ? old.selectedIds : (Array.isArray(old.selectedPhotoIds) ? old.selectedPhotoIds : [])

        if (version < 4) {
          // v4: 重命名 selectedPhotoIds 为 selectedIds, 强制开启分组
          return {
            ...initialState, // 确保有默认值
            filterCatId: old.filterCatId ?? null,
            filterTagIds: safeFilterTagIds,
            searchQuery: old.searchQuery ?? '',
            activeGroupId: old.activeGroupId ?? null,
            isMultiSelect: old.isMultiSelect ?? false,
            sidebarCollapsed: old.sidebarCollapsed ?? false,
            selectedIds: safeSelectedIds,
            language: old.language ?? 'en',
            sortOrder: old.sortOrder ?? 'newest',
            showGroupsCollapsed: true, // 强制默认开启
          }
        }
        
        // Even for version 4, ensure arrays are safe if they somehow got corrupted
        return {
          ...old,
          filterTagIds: safeFilterTagIds,
          selectedIds: safeSelectedIds
        }
      },

      skipHydration: false,

      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Store 持久化恢复失败:', error)
          storage.remove('photoX-ui-storage')
        }
      },
    }
  )
)

export { useStore as useGalleryStore }

