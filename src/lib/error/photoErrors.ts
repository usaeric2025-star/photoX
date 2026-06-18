import { ErrorCode } from '@/shared/errorCodes';

export enum PhotoErrorType {
  NETWORK = 'network',
  UNAUTHORIZED = 'unauthorized',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
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
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load failed') || msg.includes('fetch failed')) {
      return PhotoErrorType.NETWORK;
    }

    const errObj = error as unknown as Record<string, unknown>;
    const status = (typeof errObj.status === 'number' ? errObj.status : null) ?? 
                   (typeof errObj.statusCode === 'number' ? errObj.statusCode : null);
    
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

export interface FriendlyErrorInfo {
  title: { zh: string; en: string };
  message: { zh: string; en: string };
  action: { zh: string; en: string };
}

export const PhotoErrorMessages: Record<PhotoErrorType, FriendlyErrorInfo> = {
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
  [PhotoErrorType.UNKNOWN]: {
    title: { zh: '载入照片时出错', en: '载入照片时出错' },
    message: { zh: '发生了一个非预期的错误，请复制下方的诊断代码并联系技术人员。', en: '发生了一个非预期的错误，请复制下方的诊断代码并联系技术人员。' },
    action: { zh: '点此重试', en: '点此重试' },
  },
};

export function getLocalizedError(type: PhotoErrorType, _lang?: string): { title: string; message: string; action: string } {
  const info = PhotoErrorMessages[type] || PhotoErrorMessages[PhotoErrorType.UNKNOWN];
  return {
    title: info.title.zh,
    message: info.message.zh,
    action: info.action.zh,
  };
}
