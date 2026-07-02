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
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset loaded state when src changes
    useEffect(() => {
        setIsLoaded(false);
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

    const lqipSrc = useMemo(() => {
        if (providedLqip) return providedLqip;
        if (!src) return undefined;
        try {
            const url = new URL(src, window.location.origin);
            if (url.searchParams.has('w')) {
                url.searchParams.set('w', '20');
                url.searchParams.delete('h');
                return url.toString();
            }
        } catch(e) {}
        return undefined;
    }, [src, providedLqip]);

    return (
        <div className={cn("relative overflow-hidden bg-surface-mute w-full h-full", containerClassName)}>
            {/* 1. Static placeholder */}
            {!isLoaded && !lqipSrc && (
                <div className="absolute inset-0 bg-surface-base z-10" />
            )}

            {/* 2. Low Quality Image Placeholder */}
            {!isLoaded && lqipSrc && (
                <img
                    src={lqipSrc}
                    alt=""
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover object-center z-10",
                        className?.includes('object-contain') && 'object-contain',
                        className?.includes('object-fill') && 'object-fill'
                    )}
                    aria-hidden="true"
                />
            )}

            {/* 3. Final Image */}
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                onLoad={handleLoad}
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
        </div>
    );
}

