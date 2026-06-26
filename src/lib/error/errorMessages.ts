export const errorMessageMap: Record<string, string> = {
  'network': '網路連線異常，請檢查網路後重試',
  'timeout': '請求逾時，請稍後再試',
  'storage_full': '儲存空間已滿，請清理後重試',
  'permission_denied': '權限不足，請聯絡管理員',
  'file_too_large': '檔案過大，請壓縮後重新上傳',
  'unsupported_format': '不支援的檔案格式',
  'server_error': '伺服器異常，請稍後再試',
  'auth_failed': '認證失敗，請重新登入',
  'upload_failed': '上傳失敗',
};

export function getErrorMessage(error: unknown): string {
  if (!error) return '發生未知錯誤，請稍後再試';
  
  const errObj = error as Record<string, unknown>;
  // 如果有 traceId，顯示給使用者
  const baseMessage = (() => {
    // 映射錯誤碼
    if (typeof errObj.code === 'string' && errorMessageMap[errObj.code]) {
      return errorMessageMap[errObj.code];
    }
    
    // 預設訊息
    return (typeof errObj.message === 'string' ? errObj.message : '') || '發生未知錯誤，請稍後再試';
  })();
  
  if (typeof errObj.traceId === 'string' && errObj.traceId) {
    return `${baseMessage} (追蹤碼: ${errObj.traceId})`;
  }
  
  return baseMessage;
}
