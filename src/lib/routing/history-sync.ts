/**
 * history-sync.ts
 * Ensures wouter is notified of window.history.pushState and replaceState calls.
 * This is crucial for compatibility with libraries like nuqs that bypass wouter's setLocation.
 */
export function syncHistoryWithWouter() {
  if (typeof window === 'undefined') return;

  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;
  
  window.history.pushState = function(...args) {
    const result = originalPush.apply(this, args);
    window.dispatchEvent(new Event('popstate'));
    return result;
  };
  
  window.history.replaceState = function(...args) {
    const result = originalReplace.apply(this, args);
    window.dispatchEvent(new Event('popstate'));
    return result;
  };
}
