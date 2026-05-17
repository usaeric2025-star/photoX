export const convertToJpegAndResize = async (imageBase: string, maxWidth: number = 1000): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!imageBase.startsWith('data:') && !imageBase.startsWith('blob:') && !imageBase.startsWith('http')) {
      resolve(imageBase);
      return;
    }

    const img = new Image();
    if (imageBase.startsWith('http')) {
        img.crossOrigin = 'Anonymous';
    }
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageBase);
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        const jpegBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(jpegBase64);
      } catch (e) {
        console.warn('Canvas toDataURL failed (likely CORS taint):', e);
        resolve(imageBase);
      }
    };
    img.onerror = () => {
        console.error('Image load failed for conversion.');
        reject(new Error('Image conversion failed'));
    };
    img.src = imageBase;
  });
};
