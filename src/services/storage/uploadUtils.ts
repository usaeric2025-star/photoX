import { ErrorFactory } from '../../lib/error/ErrorFactory';

export const compressImage = (base64Data: string, maxWidth = 1920, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(ErrorFactory.wrap(new Error('Failed to get canvas context'), 'compressImage'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const result = canvas.toDataURL('image/webp', quality);
      
      canvas.width = 0;
      canvas.height = 0;
      img.src = '';
      
      resolve(result);
    };
    img.onerror = () => reject(ErrorFactory.wrap(new Error('图片加载到画布失败，请确保文件格式完整且是有效的图片'), 'compressImage'));
    img.src = base64Data;
  });
};

export function dataURLToArrayBuffer(dataurl: string): { buffer: ArrayBuffer; mime: string } {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  if (arr.length < 2) {
    throw ErrorFactory.wrap(new Error('Invalid data URL format'), 'dataURLToArrayBuffer');
  }
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return { buffer: u8arr.buffer, mime };
}
