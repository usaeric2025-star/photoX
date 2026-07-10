import React, { createContext, useContext } from 'react';

const AdminModeContext = createContext<boolean>(false);

export function AdminModeProvider({ children, value }: { children: React.ReactNode, value: boolean }) {
  return React.createElement(AdminModeContext.Provider, { value }, children);
}

/**
 * Unified hook to get the effective admin mode.
 * Resolves whether the current component tree is rendered within the Admin Panel.
 */
export function useAdminMode(): boolean {
  const context = useContext(AdminModeContext);
  
  // ✅ 兜底：如果 Context 不存在或是 false，且 URL 屬於 admin 相關，則返回 true
  if (!context && typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    return pathname.startsWith('/admin') || pathname.startsWith('/settings') || pathname.startsWith('/diagnostics');
  }
  
  return context;
}
