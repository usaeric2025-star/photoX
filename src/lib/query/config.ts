export const STALE_TIMES = {
  /** 合組詳情：30 秒（配合預加載） */
  GROUP_DETAIL: 30_000,
  /** 照片列表：5 秒 */
  PHOTO_LIST: 5_000,
  /** 基礎數據（分類/標籤/廠商）：10 分鐘 */
  BASE_DATA: 600_000,
  /** AI 審計日誌：1 小時 */
  AI_AUDIT: 3_600_000,
} as const;
