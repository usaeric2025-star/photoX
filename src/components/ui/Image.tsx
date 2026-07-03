import { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '#lib/utils.js';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    containerClassName?: string;
    lqipSrc?: string;
    disableFade?: boolean;
    priority?: boolean;
}

/**
 * Highly efficient progressive Image component:
 * 1. Fast LQIP loading natively
 * 2. Final Image fade-in transition
 */
export function Image({ 
    src, 
    alt, 
    className, 
    containerClassName,
    lqipSrc: providedLqip,
    onLoad,
    disableFade = false,
    priority = false,
    ...props 
}: ImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset loaded and error states when src changes
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
    }, [src]);

    // Check if already loaded from cache
    useEffect(() => {
        if (imgRef.current?.complete) {
            setIsLoaded(true);
        }
    }, [src]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setIsLoaded(true);
        onLoad?.(e);
    };

    // Skip LQIP rendering if lqipSrc is identical to src (e.g., when image worker is disabled)
    const lqipSrc = providedLqip && providedLqip !== src ? providedLqip : undefined;

    return (
        <div className={cn("relative overflow-hidden bg-surface-mute w-full h-full", containerClassName)}>
            {/* 1. Error Placeholder */}
            {hasError && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-surface-soft text-text-soft p-4 text-center">
                    <svg className="w-8 h-8 opacity-40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="text-xs opacity-50 font-sans line-clamp-2 select-none">{alt || '图片加载失败'}</span>
                </div>
            )}

            {/* 2. Loading Placeholder / LQIP */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 z-10 bg-surface-mute">
                    {lqipSrc ? (
                        <div className="w-full h-full relative overflow-hidden bg-surface-mute">
                            <img
                                src={lqipSrc}
                                alt=""
                                className={cn(
                                    "w-full h-full object-cover object-center filter blur-md scale-105",
                                    className?.includes('object-contain') && 'object-contain',
                                    className?.includes('object-fill') && 'object-fill'
                                )}
                                aria-hidden="true"
                            />
                            {/* Subtle pulse overlay to indicate active loading */}
                            <div className="absolute inset-0 bg-surface-base/15 animate-pulse" />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-surface-mute animate-pulse flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {/* 3. Final Image */}
            {!hasError && (
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={() => setHasError(true)}
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover object-center z-20",
                        !disableFade && "transition-opacity duration-200 ease-out",
                        (isLoaded || disableFade) ? "opacity-100" : "opacity-0",
                        className
                    )}
                    loading={priority ? "eager" : "lazy"}
                    {...(priority ? { fetchPriority: "high" } : {})}
                    {...props}
                />
            )}
        </div>
    );
}

