export const STALE_TIMES = {
  /** REALTIME：0 秒（永遠獲取最新） */
  REALTIME: 0,
  /** 快速狀態：4 秒（防止重複掛載時的閃爍） */
  FAST: 4_000,
  /** 照片列表：5 秒 */
  PHOTO_LIST: 5_000,
  /** 合組詳情：30 秒（配合預加載） */
  GROUP_DETAIL: 30_000,
  /** 短期緩存（設置/狀態/搜尋）：1 分鐘 */
  SHORT: 60_000,
  /** 中等緩存（分類/標籤/日常狀態）：5 分鐘 */
  MEDIUM: 300_000,
  /** 基礎數據：10 分鐘 */
  BASE_DATA: 600_000,
  /** 系統/AI 審計日誌：1 小時 */
  LONG: 3_600_000,
  /** 靜態數據：永不過期 */
  INFINITY: Infinity,
} as const;
