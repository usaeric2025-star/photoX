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
  editingPhotoId: string | null
  batchEditIds: string[] | null
  hasLoadedOnce: boolean
  hasInitialLoaded: boolean
  alertDialog: {
    title: string
    message: string
    type?: 'info' | 'danger' | 'warning'
    confirmLabel?: string
    cancelLabel?: string
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
    secondaryAction?: {
      label: string
      onClick: () => void | Promise<void>
      type?: 'info' | 'danger'
    }
  } | null
  promptDialog: {
    title: string
    message?: string
    placeholder?: string
    defaultValue?: string
    onSubmit: (value: string) => void | Promise<void>
    onCancel?: () => void
  } | null
  language: 'zh' | 'en' | 'ms'
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
  columns: 2 | 3 | 5
  lightboxIndex: number | null
  showWhatsAppChoice: boolean
  activePhotoId: string | null
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
  setEditingPhotoId: (id: string | null) => void
  setBatchEditIds: (ids: string[] | null) => void
  setHasLoadedOnce: (hasLoaded: boolean) => void
  setAlertDialog: (dialog: StoreState['alertDialog']) => void
  setPromptDialog: (dialog: StoreState['promptDialog']) => void
  setLanguage: (lang: 'zh' | 'en' | 'ms') => void
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
  setColumns: (cols: 2 | 3 | 5) => void
  setLightboxIndex: (index: number | null) => void
  setShowWhatsAppChoice: (value: boolean) => void
  setActivePhotoId: (id: string | null) => void
  setHasInitialLoaded: (value: boolean) => void
  clearAndExitMultiSelect: () => void
  resetFiltersAndRefresh: () => Promise<void>
  togglePreviewMode: () => void
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
  editingPhotoId: null,
  batchEditIds: null,
  alertDialog: null,
  promptDialog: null,
  language: 'en',
  filterSubId: null,
  sortOrder: 'newest',
  isStaffMode: false,
  showGroupsCollapsed: true,
  viewMode: 'grid',
  adminPreviewMode: 'private',
  isSyncing: false,
  activeScreen: 'home',
  isInfiniteMode: true,
  geminiApiKey: null,
  customModel: 'Gemini 2.5 Flash Lite Preview 09-2025',
  accessPasscode: null,
  settings: null,
  user: null,
  isAnalyzing: false,
  aiDebugInfo: null,
  errors: [],
  appLang: 'en',
  debouncedSearchQuery: '',
  tagIdToNameMap: {},
  columns: 3,
  lightboxIndex: null,
  showWhatsAppChoice: false,
  activePhotoId: null,
  hasLoadedOnce: false,
  hasInitialLoaded: false,
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
  'columns'
]

// ========== 创建 store ==========

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setFilterCatId: (id) => set({ 
        filterCatId: id,
        lightboxIndex: null,
        selectedIds: []
      }),
      setFilterTagIds: (idsOrFn) => set((state) => {
        const next = typeof idsOrFn === 'function' ? idsOrFn(state.filterTagIds) : idsOrFn;
        return { 
          filterTagIds: next,
          lightboxIndex: null,
          selectedIds: []
        };
      }),
      setSearchQuery: (query) => set({ 
        searchQuery: query,
        lightboxIndex: null,
        selectedIds: []
      }),
      setActiveGroupId: (id) => set({ 
        activeGroupId: id,
        selectedIds: [] // 清空选择
      }),
      setIsMultiSelect: (value) => set({ isMultiSelect: value }),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setSelectedIds: (idsOrFn) => set((state) => ({ 
        selectedIds: typeof idsOrFn === 'function' ? idsOrFn(state.selectedIds) : idsOrFn 
      })),
      setLoadingType: (type) => set({ loadingType: type }),
      setEditPhotoId: (id) => set({ editPhotoId: id }),
      setEditingPhotoId: (id) => set({ editingPhotoId: id }),
      setBatchEditIds: (ids) => set({ batchEditIds: ids }),
      setHasLoadedOnce: (hasLoaded) => set({ hasLoadedOnce: hasLoaded }),
      setHasInitialLoaded: (value) => set({ hasInitialLoaded: value }),
      
      clearAndExitMultiSelect: () => set({
        selectedIds: [],
        isMultiSelect: false,
      }),

      resetFiltersAndRefresh: async () => {
        set({
          filterCatId: null,
          filterTagIds: [],
          filterSubId: null,
          searchQuery: '',
          debouncedSearchQuery: '',
          lightboxIndex: null,
          activeGroupId: null,
          activePhotoId: null,
        });
        // Note: resetFiltersAndRefresh might need to trigger a refetch if we had access to queryClient here,
        // but typically we'll just reset the state and the component will react.
      },

      togglePreviewMode: () => set((state) => {
        const nextMode = state.adminPreviewMode === 'public' ? 'private' : 'public';
        return {
          adminPreviewMode: nextMode,
          activeScreen: nextMode === 'public' ? 'home' : 'settings',
        };
      }),

      setAlertDialog: (dialog) => set({ alertDialog: dialog }),
      setPromptDialog: (dialog) => set({ promptDialog: dialog }),
      setLanguage: (lang) => set({ language: lang }),
      setFilterSubId: (id) => set({ 
        filterSubId: id,
        lightboxIndex: null,
        selectedIds: []
      }),
      setSortOrder: (order) => set({ 
        sortOrder: order,
        lightboxIndex: null,
        selectedIds: []
      }),
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
      setSettings: (settings) => {
        if (settings) {
          set({ 
            settings,
            geminiApiKey: settings.gemini_api_key !== undefined ? settings.gemini_api_key : get().geminiApiKey,
            customModel: settings.custom_model !== undefined ? settings.custom_model : get().customModel,
            accessPasscode: settings.access_passcode !== undefined ? settings.access_passcode : get().accessPasscode
          });
        } else {
          set({ settings });
        }
      },
      setUser: (user) => set({ user }),
      setIsAnalyzing: (value) => set({ isAnalyzing: value }),
      setAiDebugInfo: (info) => set({ aiDebugInfo: info }),
      clearErrors: () => set({ errors: [] }),
      setAppLang: (lang) => set({ appLang: lang, language: lang }),
      setDebouncedSearchQuery: (query) => set({ 
        debouncedSearchQuery: query,
        lightboxIndex: null
      }),
      setColumns: (cols) => set({ columns: cols }),
      setLightboxIndex: (index) => set({ lightboxIndex: index }),
      setShowWhatsAppChoice: (value) => set({ showWhatsAppChoice: value }),
      setActivePhotoId: (id) => set({ activePhotoId: id }),

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
            appLang: old.appLang ?? 'en',
            columns: old.columns ?? 3,
            showGroupsCollapsed: true, // 强制默认开启
          }
        }
        
        // Even for version 4, ensure arrays are safe if they somehow got corrupted
        return {
          ...old,
          filterTagIds: safeFilterTagIds,
          selectedIds: safeSelectedIds,
          columns: old.columns ?? 3,
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

