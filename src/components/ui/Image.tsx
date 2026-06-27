import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { blurhashToDataUrl, isValidBlurhash } from '@/lib/image/blurhash';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    blurhash?: string | null;
    containerClassName?: string;
}

/**
 * Enhanced Image component with 3-stage progressive loading:
 * 1. Skeleton (CSS Pulse)
 * 2. BlurHash (Low-res colored preview)
 * 3. Final Image (Fade-in transition)
 */
export function Image({ 
    src, 
    alt, 
    blurhash, 
    className, 
    containerClassName,
    onLoad,
    ...props 
}: ImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>('');

    useEffect(() => {
        if (isValidBlurhash(blurhash)) {
            setPreviewUrl(blurhashToDataUrl(blurhash!));
        }
    }, [blurhash]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setIsLoaded(true);
        onLoad?.(e);
    };

    return (
        <div className={cn("relative overflow-hidden bg-surface-mute", containerClassName)}>
            {/* 1. Skeleton / Pulse (visible until fully loaded) */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
            )}

            {/* 2. BlurHash Preview */}
            {previewUrl && !isLoaded && (
                <img
                    src={previewUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 transition-opacity duration-300"
                />
            )}

            {/* 3. Final Image */}
            <img
                src={src}
                alt={alt}
                onLoad={handleLoad}
                className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out",
                    isLoaded ? "opacity-100" : "opacity-0",
                    className
                )}
                loading="lazy"
                {...props}
            />
        </div>
    );
}
