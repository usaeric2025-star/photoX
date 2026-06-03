import { Photo } from "@/types";
import { getThumbnailUrl } from "@/lib/image-url";

export const toLightboxSlides = (photos: Photo[]) => {
  return photos.map(photo => {
    const originalWidth = photo.width || 1920;
    const originalHeight = photo.height || 1080;
    const aspectRatio = originalHeight / originalWidth;

    const generateSource = (width: number) => ({
      src: getThumbnailUrl(photo.image_url, width),
      width,
      height: Math.round(width * aspectRatio),
    });

    return {
      src: getThumbnailUrl(photo.image_url, 1920),
      srcSet: [
        generateSource(320),
        generateSource(640),
        generateSource(1200),
      ],
      width: originalWidth,
      height: originalHeight,
      alt: photo.name || "",
      photo, // Pass the full photo object for metadata rendering
    };
  });
};
