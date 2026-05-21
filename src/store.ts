import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storage } from '@/lib/storage'

// 定义需要持久化的状态（白名单）
const PERSIST_KEYS = [
  'filterCatId',
  'filterTagIds', 
  'searchQuery',
  'activeGroupId',
  'isMultiSelect',
  'sidebarCollapsed',
  'selectedPhotoIds'
] as const

interface StoreState {
  // UI 状态（持久化）
  filterCatId: string | null
  filterTagIds: string[]
  searchQuery: string
  activeGroupId: string | null
  isMultiSelect: boolean
  sidebarCollapsed: boolean
  selectedPhotoIds: string[]
  
  // 缺失的状态
  user: any | null
  settings: any | null
  geminiApiKey: string
  customModel: string
  accessPasscode: string
  loadingType: 'none' | 'global' | 'local' | 'analyzing' | 'sync-pull' | 'sync-push'
  editPhotoId: string | null
  batchEditIds: string[] | null
  errors: any[]

  // Actions
  setFilterCatId: (id: string | null) => void
  setFilterTagIds: (ids: string[]) => void
  setSearchQuery: (query: string) => void
  setActiveGroupId: (id: string | null) => void
  setIsMultiSelect: (value: boolean) => void
  setSidebarCollapsed: (value: boolean) => void
  setSelectedPhotoIds: (ids: string[]) => void
  resetFilters: () => void
  resetUI: () => void
  
  // 缺失的 actions
  setUser: (user: any | null) => void
  setSettings: (settings: any) => void
  setGeminiApiKey: (key: string) => void
  setCustomModel: (model: string) => void
  setAccessPasscode: (pass: string) => void
  setLoadingType: (type: 'none' | 'global' | 'local' | 'analyzing' | 'sync-pull' | 'sync-push') => void
  setEditPhotoId: (id: string | null) => void
  setBatchEditIds: (ids: string[] | null) => void
  setErrors: (errors: any[]) => void
  withLoading: <T>(type: 'none' | 'global' | 'local' | 'analyzing' | 'sync-pull' | 'sync-push', fn: () => Promise<T>) => Promise<T>
  setAlertDialog: (dialog: any) => void
  logout: () => void
  loginWithGoogle: () => Promise<void>
  setDebouncedSearchQuery: (query: string) => void
}

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // 初始状态
      filterCatId: null,
      filterTagIds: [],
      searchQuery: '',
      activeGroupId: null,
      isMultiSelect: false,
      sidebarCollapsed: false,
      selectedPhotoIds: [],
      user: null,
      settings: null,
      geminiApiKey: '',
      customModel: '',
      accessPasscode: '',
      loadingType: 'none',
      editPhotoId: null,
      batchEditIds: null,
      errors: [],

      // Actions
      setFilterCatId: (id) => set({ filterCatId: id }),
      setFilterTagIds: (ids) => set({ filterTagIds: ids }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveGroupId: (id) => set({ activeGroupId: id }),
      setIsMultiSelect: (value) => set({ isMultiSelect: value }),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setSelectedPhotoIds: (ids) => set({ selectedPhotoIds: ids }),
      setUser: (user) => set({ user }),
      setSettings: (settings) => set({ settings }),
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setCustomModel: (model) => set({ customModel: model }),
      setAccessPasscode: (pass) => set({ accessPasscode: pass }),
      setLoadingType: (type) => set({ loadingType: type }),
      setEditPhotoId: (id) => set({ editPhotoId: id }),
      setBatchEditIds: (ids) => set({ batchEditIds: ids }),
      setErrors: (errors) => set({ errors }),
      withLoading: async (type, fn) => {
          set({ loadingType: type });
          try { return await fn(); } finally { set({ loadingType: 'none' }); }
      },
      setAlertDialog: (dialog) => set({ }), // Placeholder for now
      logout: () => set({ user: null }),
      loginWithGoogle: async () => {}, // Placeholder
      setDebouncedSearchQuery: (query) => set({ searchQuery: query }),

      resetFilters: () => set({
        filterCatId: null,
        filterTagIds: [],
        searchQuery: '',
      }),
      
      resetUI: () => set({
        filterCatId: null,
        filterTagIds: [],
        searchQuery: '',
        activeGroupId: null,
        isMultiSelect: false,
        selectedPhotoIds: [],
      }),
    }),
    {
      name: 'photoX-ui-storage',
      version: 3,
      
      // 使用自定义存储
      storage: {
        getItem: (name) => {
          const value = storage.get(name, null)
          return value ? { state: value } : null
        },
        setItem: (name, value) => {
          storage.set(name, value.state)
        },
        removeItem: (name) => {
          storage.remove(name)
        },
      },
      
      // 只持久化白名单中的字段
      partialize: (state) => {
        const persisted: Partial<StoreState> = {}
        for (const key of PERSIST_KEYS) {
          if (key in state) {
            persisted[key as keyof StoreState] = state[key as keyof StoreState]
          }
        }
        return persisted
      },
      
      // 数据迁移
      migrate: (persistedState, version) => {
        if (version < 3) {
           return { ...persistedState } as StoreState
        }
        return persistedState as StoreState
      },
      
      // 跳过持久化时的 hydration（防止闪烁）
      skipHydration: false,
    }
  )
)

export { useStore as useGalleryStore, useStore }
