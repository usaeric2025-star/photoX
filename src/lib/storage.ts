// 统一的存储服务，替代直接使用 localStorage
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key)
      if (!item) return defaultValue
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Storage get failed for key "${key}":`, error)
      // 数据损坏时清理
      localStorage.removeItem(key)
      return defaultValue
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error(`Storage set failed for key "${key}":`, error)
      return false
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Storage remove failed for key "${key}":`, error)
    }
  },

  clear(): void {
    try {
      const keysToKeep = ['theme', 'language'] // 需要保留的用户偏好
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Storage clear failed:', error)
    }
  }
}
