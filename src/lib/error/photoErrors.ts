import { ErrorCode } from '#shared/errorCodes';

export enum PhotoErrorType {
  NETWORK = 'network',
  UNAUTHORIZED = 'unauthorized',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

export function classifyPhotoError(error: unknown): PhotoErrorType {
  if (!error) {
    return PhotoErrorType.UNKNOWN;
  }

  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return PhotoErrorType.NETWORK;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('超時') || msg.includes('逾時')) {
      return PhotoErrorType.TIMEOUT;
    }
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load failed') || msg.includes('fetch failed')) {
      return PhotoErrorType.NETWORK;
    }

    const errObj = error as unknown as Record<string, unknown>;
    const status = (typeof errObj.status === 'number' ? errObj.status : null) ?? 
                   (typeof errObj.statusCode === 'number' ? errObj.statusCode : null);
    
    if (status === 504 || status === 408) {
      return PhotoErrorType.TIMEOUT;
    }
    if (status === 401 || status === 403) {
      return PhotoErrorType.UNAUTHORIZED;
    }
    if (status === 404) {
      return PhotoErrorType.NOT_FOUND;
    }
    if (status && status >= 500) {
      return PhotoErrorType.SERVER;
    }

    const code = errObj.code;
    if (code === ErrorCode.THIRD_PARTY_TIMEOUT) {
      return PhotoErrorType.TIMEOUT;
    }
    if (code === ErrorCode.NETWORK_ERROR) {
      return PhotoErrorType.NETWORK;
    }
    if (code === ErrorCode.UNAUTHORIZED || code === ErrorCode.PERMISSION_DENIED) {
      return PhotoErrorType.UNAUTHORIZED;
    }
    if (code === ErrorCode.NOT_FOUND) {
      return PhotoErrorType.NOT_FOUND;
    }
    if (code === ErrorCode.INTERNAL_ERROR) {
      return PhotoErrorType.SERVER;
    }
  }

  const errObj = error as unknown as Record<string, unknown>;
  const status = (typeof errObj.status === 'number' ? errObj.status : null) ?? 
                 (typeof errObj.statusCode === 'number' ? errObj.statusCode : null);
  
  if (status === 504 || status === 408) {
    return PhotoErrorType.TIMEOUT;
  }
  if (status === 401 || status === 403) {
    return PhotoErrorType.UNAUTHORIZED;
  }
  if (status === 404) {
    return PhotoErrorType.NOT_FOUND;
  }
  if (status && status >= 500) {
    return PhotoErrorType.SERVER;
  }

  return PhotoErrorType.UNKNOWN;
}

interface FriendlyErrorInfo {
  title: { zh: string; en: string };
  message: { zh: string; en: string };
  action: { zh: string; en: string };
}

const PhotoErrorMessages: Record<PhotoErrorType, FriendlyErrorInfo> = {
  [PhotoErrorType.NETWORK]: {
    title: { zh: '无法连接到服务器', en: '无法连接到服务器' },
    message: { zh: '请检查您的网络连接是否稳定。如果网络正常，请稍后再试。', en: '请检查您的网络连接是否稳定。如果网络正常，请稍后再试。' },
    action: { zh: '立即重试', en: '立即重试' },
  },
  [PhotoErrorType.UNAUTHORIZED]: {
    title: { zh: '权限或会话失效', en: '权限或会话失效' },
    message: { zh: '您当前的登录状态已过期，或者您没有访问此内容的权限。', en: '您当前的登录状态已过期，或者您没有访问此内容的权限。' },
    action: { zh: '重新登录', en: '重新登录' },
  },
  [PhotoErrorType.SERVER]: {
    title: { zh: '后端服务响应异常', en: '后端服务响应异常' },
    message: { zh: '服务器在处理请求时遇到问题（代码 5xx），请联系管理员排查。', en: '服务器在处理请求时遇到问题（代码 5xx），请联系管理员排查。' },
    action: { zh: '手动刷新', en: '手动刷新' },
  },
  [PhotoErrorType.NOT_FOUND]: {
    title: { zh: '请求的内容不存在', en: '请求的内容不存在' },
    message: { zh: '该照片、合组或分类可能已被删除，或者您使用了错误的访问链接。', en: '该照片、合组或分类可能已被删除，或者您使用了错误的访问链接。' },
    action: { zh: '返回首页', en: '返回首页' },
  },
  [PhotoErrorType.TIMEOUT]: {
    title: { zh: '請求逾時，可能服務繁忙 (504)', en: '請求逾時，可能服務繁忙 (504)' },
    message: { zh: '操作耗時過長已被系統安全中斷。這通常是因為後端服務冷啟動、資料庫負載過高或外部 AI API 響應過慢。', en: '操作耗時過長已被系統安全中斷。這通常是因為後端服務冷啟動、資料庫負載過高或外部 AI API 響應過慢。' },
    action: { zh: '重新嘗試', en: '重新嘗試' },
  },
  [PhotoErrorType.UNKNOWN]: {
    title: { zh: '载入照片时出错', en: '载入照片时出错' },
    message: { zh: '发生了一个非预期的错误，请复制下方的诊断代码并联系技术人员。', en: '发生了一个非预期的错误，请复制下方的诊断代码并联系技术人员。' },
    action: { zh: '点此重试', en: '点此重试' },
  },
};

export function getLocalizedError(type: PhotoErrorType, _lang?: string, error?: unknown): { title: string; message: string; action: string } {
  const info = PhotoErrorMessages[type] || PhotoErrorMessages[PhotoErrorType.UNKNOWN];
  
  if (type === PhotoErrorType.TIMEOUT && error) {
    const errorStr = String(error instanceof Error ? error.message : JSON.stringify(error));
    
    let subTitle = '請求處理逾時 (Timeout)';
    let subMessage = '操作執行時間超過系統設定的安全閾值，已被看門狗機制中斷。請稍後重試。';
    let subAction = '立即重試';

    if (errorStr.includes('Initialize Settings & Auth APIs')) {
      subTitle = '系統初始化逾時 (25秒)';
      subMessage = '前端看門狗檢測到載入系統核心設定與認證狀態 (Settings & Auth APIs) 時逾時。這通常發生在 Vercel Serverless Function 冷啟動、資料庫連線池滿載或 PostgreSQL 還在睡眠中。';
    } else if (errorStr.includes('Supabase Get Auth Session')) {
      subTitle = '會員認證連線逾時 (3秒)';
      subMessage = '前端看門狗在請求 Supabase 會員狀態時 3000ms 未響應。可能原因：您的網路阻擋了 Supabase 連線，或者認證伺服器當前繁忙。我們已為您安全降級為訪客身分繼續瀏覽。';
    } else if (errorStr.includes('AI Analyze Group Materials & Colors')) {
      subTitle = 'AI 智慧分析逾時 (120秒)';
      subMessage = '批量照片智能合組與特徵提取 (analyzeGroup) 執行超過 120 秒而被看門狗中斷。可能原因：照片檔案過大、一次性分析照片過多（建議不超過 10 張），或外部 AI 提供商 (Google Gemini / OpenRouter) 當前請求量過大，建議稍後再試。';
    } else if (errorStr.includes('DB Query Settings table')) {
      subTitle = '資料庫設定讀取逾時';
      subMessage = '後端看門狗讀取 settings 設定表時逾時。這代表當前資料庫執行緒已被阻塞，請前往「系統診斷控制台」進行自檢與修復。';
    } else if (errorStr.includes('DB Query Access Passcode secret')) {
      subTitle = '資料庫密鑰讀取逾時';
      subMessage = '後端看門狗讀取 access_passcode 密鑰表時逾時。這通常是因為資料庫並行鎖定 (Lock) 或連線超載。';
    } else if (errorStr.includes('AI Chat Test Connection')) {
      subTitle = 'AI 連線測試逾時';
      subMessage = '與 AI 推理伺服器的握手測試逾時。請確認您的 .env 中配置的 API Key 與 Provider 網路是否暢通。';
    } else if (errorStr.includes('statement_timeout') || errorStr.includes('statement timeout')) {
      subTitle = '資料庫語句執行逾時';
      subMessage = 'PostgreSQL 連線級看門狗 (statement_timeout) 強制中斷了當前 SQL。通常是因為對未建索引的大表進行了複雜的全表掃描，或是資料庫表格正被寫入鎖定 (Locking)。';
    }

    return {
      title: subTitle,
      message: subMessage,
      action: subAction,
    };
  }

  if (type === PhotoErrorType.NOT_FOUND && error) {
    const errorStr = String(error instanceof Error ? error.message : JSON.stringify(error)).toLowerCase();
    
    let subTitle = '請求的內容不存在';
    let subMessage = '該照片、合組或分類可能已被刪除，或者您使用了錯誤的訪問連結。';
    let subAction = '返回首頁';
    
    if (errorStr.includes('/api/photos') || errorStr.includes('photo')) {
      subTitle = '照片不存在或已刪除 (404)';
      subMessage = '您所請求的特定照片資源不存在。它可能已被管理員永久刪除，或者其 ID 已失效。';
    } else if (errorStr.includes('/api/groups') || errorStr.includes('group')) {
      subTitle = '合組不存在或已刪除 (404)';
      subMessage = '您所請求的照片合組不存在。此合組可能已被解散、刪除，或該連結的合組 ID 不正確。';
    } else if (errorStr.includes('/api/categories') || errorStr.includes('category')) {
      subTitle = '分類不存在或已刪除 (404)';
      subMessage = '該照片分類不存在。它可能已被重命名、刪除，或路徑參數不正確。';
    } else if (errorStr.includes('/api/tags') || errorStr.includes('tag')) {
      subTitle = '標籤不存在或已刪除 (404)';
      subMessage = '該照片標籤不存在。標籤可能已被管理員刪除或清理。';
    } else if (errorStr.includes('/api/') || errorStr.includes('api endpoint') || errorStr.includes('route')) {
      subTitle = 'API 端點不存在 (404)';
      subMessage = '後端服務未正確載入此 API 端點。請檢查後端路由、vercel.json 配置或開發伺服器運行狀態。';
    }
    
    return {
      title: subTitle,
      message: subMessage,
      action: subAction,
    };
  }

  return {
    title: info.title.zh,
    message: info.message.zh,
    action: info.action.zh,
  };
}
