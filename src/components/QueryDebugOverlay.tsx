import React, { useState, useEffect } from 'react';

// Use a simple global state to track query statuses for the debug overlay
(window as any).queryDebugStatus = {
  status: 'idle',
  count: 0,
  error: null,
  lastUpdated: null,
};

export const QueryDebugOverlay: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState((window as any).queryDebugStatus);

  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo({ ...(window as any).queryDebugStatus });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const isVisible = process.env.NODE_ENV === 'development' || window.location.hostname.includes('vercel.app');
  if (!isVisible) return null;

  const bgColor = debugInfo.status === 'error' ? 'bg-red-500' : debugInfo.status === 'success' ? 'bg-green-500' : 'bg-gray-500';

  return (
    <div className={`fixed bottom-20 right-4 ${bgColor} text-white p-3 rounded-lg shadow-lg z-[9999] text-xs max-w-xs`}>
      <div className="font-bold">查询状态: {debugInfo.status}</div>
      <div>照片数量: {debugInfo.count}</div>
      {debugInfo.error && <div className="mt-1 font-mono break-words">错误: {debugInfo.error}</div>}
      <div className="mt-1 opacity-75">最后更新: {debugInfo.lastUpdated}</div>
    </div>
  );
};

export const updateQueryDebugStatus = (status: string, count: number, error: string | null = null) => {
  (window as any).queryDebugStatus = {
    status,
    count,
    error,
    lastUpdated: new Date().toLocaleTimeString(),
  };
};
