/// <reference lib="webworker" />

type MessageData = {
  id: string;
  file: File;
  maxWidthOrHeight: number;
  quality: number;
};

type ResponseData = {
  success: boolean;
  blob?: Blob;
  width?: number;
  height?: number;
  size?: number;
  error?: string;
};

// 监听主线程消息
addEventListener('message', async (event: MessageEvent<MessageData>) => {
  const { id, file, maxWidthOrHeight, quality } = event.data;

  try {
    // 1. 加载图片
    const bitmap = await createImageBitmap(file);
    
    // 2. 计算目标尺寸
    const { width, height } = calcSize(bitmap.width, bitmap.height, maxWidthOrHeight);

    // 3. 绘制到 OffscreenCanvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    // 4. 导出为 WebP
    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality,
    });

    // 5. 统一使用 WebP，除非转换失败
    const finalBlob = blob || file;

    bitmap.close();

    postMessage({
      id,
      success: true,
      blob: finalBlob,
      width,
      height,
      size: finalBlob.size,
    } as ResponseData);
  } catch (error) {
    // 出错时回退到原图
    postMessage({
      id,
      success: false,
      blob: file,
      width: 0,
      height: 0,
      size: file.size,
      error: error instanceof Error ? error.message : '压缩失败，使用原图',
    } as ResponseData);
  }
});

function calcSize(originalWidth: number, originalHeight: number, maxSize: number) {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }

  const ratio = Math.min(maxSize / originalWidth, maxSize / originalHeight);
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}
