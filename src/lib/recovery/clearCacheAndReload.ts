import { logger } from '@/lib/logger';

export const clearCacheAndReload = () => {
    try {
        // 1. 清除 localStorage 與 sessionStorage
        window.localStorage.clear();
        window.sessionStorage.clear();
        
        // 2. 清除 Cookies
        document.cookie.split(";").forEach((cookie) => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
  
        // 3. 注銷所有 Service Workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          });
        }
        
        logger.info('[Diagnostics] Storage with service workers cleared, performing hard reload.');
        
        // 4. 強制追加隨機 cache-bust 參數重載
        window.location.href = window.location.origin + window.location.pathname + '?cache-bust=' + Date.now();
      } catch (err) {
        window.location.reload();
      }
};
