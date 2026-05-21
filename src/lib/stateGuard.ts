/**
 * 防止状态更新导致无限循环的守卫
 */
export class StateGuard {
  private lastUpdateTime = 0
  private updateCount = 0
  private readonly MAX_UPDATES = 100
  private readonly TIME_WINDOW = 1000 // 1秒内
  
  canUpdate(): boolean {
    const now = Date.now()
    
    if (now - this.lastUpdateTime > this.TIME_WINDOW) {
      // 重置计数
      this.updateCount = 0
      this.lastUpdateTime = now
    }
    
    this.updateCount++
    
    if (this.updateCount > this.MAX_UPDATES) {
      console.error('StateGuard: 检测到无限循环，已阻止更新')
      return false
    }
    
    this.lastUpdateTime = now
    return true
  }
  
  reset(): void {
    this.updateCount = 0
    this.lastUpdateTime = 0
  }
}
