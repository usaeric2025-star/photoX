import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storage } from '@/lib/storage'
import { globalHandleError as handleError } from '@/utils/errorHandler'

// ========== 类型定义 ==========

// 只保留 UI 状态
interface UIState {
  filterCatId: string | null
  filterTagIds: string[]
  searchQuery: string
  activeGroupId: string | null
  isMultiSelect: boolean
  sidebarCollapsed: boolean
  selectedPhotoIds: string[]
  loadingType: 'none' | 'global' | 'local' | 'analyzing' | 'sync-pull' | 'sync-push'
  editPhotoId: string | null
  batchEditIds: string[] | null
  hasLoadedOnce: boolean
  alertDialog: any | null
  promptDialog: any | null
  language: 'zh' | 'en' | 'ms'
  tagStats: Record<string, number>
}

interface UIActions {
  setFilterCatId: (id: string | null) => void
  setFilterTagIds: (ids: string[]) => void
  setSearchQuery: (query: string) => void
  setActiveGroupId: (id: string | null) => void
  setIsMultiSelect: (value: boolean) => void
  setSidebarCollapsed: (value: boolean) => void
  setSelectedPhotoIds: (ids: string[]) => void
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
  selectedPhotoIds: [],
  loadingType: 'none',
  editPhotoId: null,
  batchEditIds: null,
  hasLoadedOnce: false,
  alertDialog: null,
  promptDialog: null,
  language: 'zh',
  tagStats: {},
}

// ========== 白名单（只持久化这些）==========

const PERSIST_KEYS: (keyof UIState)[] = [
  'filterCatId',
  'filterTagIds',
  'searchQuery',
  'activeGroupId',
  'isMultiSelect',
  'sidebarCollapsed',
  'selectedPhotoIds',
  'language',
]

// ========== 创建 store ==========

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setFilterCatId: (id) => set({ filterCatId: id }),
      setFilterTagIds: (ids) => set({ filterTagIds: ids }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveGroupId: (id) => set({ activeGroupId: id }),
      setIsMultiSelect: (value) => set({ isMultiSelect: value }),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setSelectedPhotoIds: (ids) => set({ selectedPhotoIds: ids }),
      setLoadingType: (type) => set({ loadingType: type }),
      setEditPhotoId: (id) => set({ editPhotoId: id }),
      setBatchEditIds: (ids) => set({ batchEditIds: ids }),
      setHasLoadedOnce: (hasLoaded) => set({ hasLoadedOnce: hasLoaded }),
      setAlertDialog: (dialog) => set({ alertDialog: dialog }),
      setPromptDialog: (dialog) => set({ promptDialog: dialog }),
      setLanguage: (lang) => set({ language: lang }),
      setTagStats: (stats) => set({ tagStats: stats }),

      addSelectedPhotoId: (id) => set((state) => ({
        selectedPhotoIds: state.selectedPhotoIds.includes(id)
          ? state.selectedPhotoIds
          : [...state.selectedPhotoIds, id]
      })),

      removeSelectedPhotoId: (id) => set((state) => ({
        selectedPhotoIds: state.selectedPhotoIds.filter(i => i !== id)
      })),

      toggleSelectedPhotoId: (id) => set((state) => ({
        selectedPhotoIds: state.selectedPhotoIds.includes(id)
          ? state.selectedPhotoIds.filter(i => i !== id)
          : [...state.selectedPhotoIds, id]
      })),

      clearSelectedPhotos: () => set({ selectedPhotoIds: [] }),

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
      version: 3,

      storage: {
        getItem: (name) => storage.get(name, null),
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.remove(name),
      },

      partialize: (state) => {
        const persisted: Partial<UIState> = {}
        for (const key of PERSIST_KEYS) {
          persisted[key] = state[key]
        }
        return persisted
      },

      // 正确的迁移逻辑
      migrate: (persistedState, version) => {
        if (version === 2) {
          // v2 -> v3: 移除业务数据
          const old = persistedState as any
          return {
            filterCatId: old.filterCatId ?? null,
            filterTagIds: old.filterTagIds ?? [],
            searchQuery: old.searchQuery ?? '',
            activeGroupId: old.activeGroupId ?? null,
            isMultiSelect: old.isMultiSelect ?? false,
            sidebarCollapsed: old.sidebarCollapsed ?? false,
            selectedPhotoIds: old.selectedPhotoIds ?? [],
          }
        }
        return persistedState as UIState
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
