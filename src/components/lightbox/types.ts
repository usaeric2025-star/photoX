export type LightboxMode = 'public' | 'admin';

export interface LightboxItem {
  id: string;
  src: string;
  thumbnail: string;
  title: string;
  description?: string;
  exif?: {
    camera?: string;
    focalLength?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: string;
  };
}
