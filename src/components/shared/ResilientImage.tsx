import React, { useState, useEffect } from 'react';
import { Skeleton, Box, Center, Text } from '@mantine/core';
import { ImageOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResilientImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackUrl?: string;
  maxRetries?: number;
  containerClassName?: string;
}

/**
 * 自研魯棒圖片組件
 * 特性：自動重試、骨架屏過渡、錯誤降級處理
 */
export function ResilientImage({
  src,
  alt,
  className,
  fallbackUrl,
  maxRetries = 2,
  containerClassName,
  ...props
}: ResilientImageProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setStatus('loading');
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        // 加上時間戳強制繞過緩存重試
        setCurrentSrc(`${src}${src?.includes('?') ? '&' : '?'}_r=${retryCount + 1}`);
      }, 1000 * (retryCount + 1));
    } else {
      setStatus('error');
    }
  };

  return (
    <Box className={cn("relative overflow-hidden bg-slate-50", containerClassName)}>
      {status === 'loading' && (
        <Skeleton 
          className="absolute inset-0 z-10" 
          animate 
          radius={0}
        />
      )}

      {status === 'error' ? (
        <Center className="absolute inset-0 z-20 flex-col gap-2 bg-slate-100 p-4 text-center">
          <ImageOff size={24} className="text-slate-300" />
          <div className="space-y-1">
            <Text size="xs" color="dimmed" className="font-bold uppercase tracking-tighter">加載失敗 / Load Failed</Text>
            <button 
              onClick={() => {
                setRetryCount(0);
                setStatus('loading');
                setCurrentSrc(`${src}${src?.includes('?') ? '&' : '?'}_t=${Date.now()}`);
              }}
              className="flex items-center gap-1.5 mx-auto text-[10px] bg-white px-2 py-1 rounded-full border border-slate-200 text-blue-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={10} /> 立即重試
            </button>
          </div>
        </Center>
      ) : (
        <img
          {...props}
          src={currentSrc}
          alt={alt}
          onLoad={() => setStatus('success')}
          onError={handleError}
          className={cn(
            className,
            "transition-opacity duration-300",
            status === 'success' ? "opacity-100" : "opacity-0"
          )}
          referrerPolicy="no-referrer"
        />
      )}
    </Box>
  );
}
