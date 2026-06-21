import { useState, useEffect } from 'react';
import { PhotoXDevTools } from './PhotoXDevTools';

interface DevToolsTriggerProps {
  children: React.ReactNode;
}

export function DevToolsTrigger({ children }: DevToolsTriggerProps) {
  // 開發模式：預設顯示
  const isDev = import.meta.env.DEV;
  
  const [clickCount, setClickCount] = useState(0);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(isDev);
  const [lastClickTime, setLastClickTime] = useState(0);

  // 點擊 Logo 計數（3 秒內點 6 下）
  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 3000) {
      setClickCount(1);
    } else {
      setClickCount(prev => prev + 1);
    }
    setLastClickTime(now);

    if (clickCount + 1 >= 6) {
      setIsDevToolsOpen(true);
      setClickCount(0);
    }
  };

  // ESC 關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDevToolsOpen) {
        setIsDevToolsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isDevToolsOpen]);

  return (
    <>
      <div onClick={handleLogoClick} className="cursor-pointer select-none">
        {children}
      </div>
      {isDevToolsOpen && (
        <PhotoXDevTools 
          onClose={() => setIsDevToolsOpen(false)} 
          isPublicMode={!isDev}
        />
      )}
    </>
  );
}

