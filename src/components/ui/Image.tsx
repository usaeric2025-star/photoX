import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    containerClassName?: string;
}

/**
 * Highly efficient progressive Image component:
 * 1. Skeleton placeholder (visible during loading)
 * 2. Final Image fade-in transition
 */
export function Image({ 
    src, 
    alt, 
    className, 
    containerClassName,
    onLoad,
    ...props 
}: ImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setIsLoaded(true);
        onLoad?.(e);
    };

    return (
        <div className={cn("relative overflow-hidden bg-surface-mute w-full h-full", containerClassName)}>
            {/* 1. Static placeholder (much lighter than animate-pulse for hundreds of items) */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-surface-base z-10" />
            )}

            {/* 2. Final Image */}
            <img
                src={src}
                alt={alt}
                onLoad={handleLoad}
                className={cn(
                    "absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ease-out",
                    isLoaded ? "opacity-100" : "opacity-0",
                    className
                )}
                loading="lazy"
                {...props}
            />
        </div>
    );
}

