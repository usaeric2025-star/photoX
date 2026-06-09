import { toast } from "sonner";
import { ErrorFactory } from './error/ErrorFactory';

/**
 * 将图片 URL 转换为 JPEG 并触发下载
 * 解决移动端社交软件对 WebP 兼容性差的问题
 */
export async function downloadPhotoAsJpeg(url: string, filename?: string) {
  const toastId = toast.loading('准备下载中...');
  const finalFilename = filename || `photo_${Date.now()}.jpg`;
  
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw ErrorFactory.wrap(new Error('网络响应异常'), 'downloadPhotoAsJpeg - fetch');
    
    const blob = await response.blob();
    
    // If it's already a jpeg, download directly
    if (blob.type === 'image/jpeg') {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast.success('已开始下载', { id: toastId });
        return;
    }
    
    // 创建 HTMLImageElement 加载图片
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(ErrorFactory.wrap(new Error('图片加载失败'), 'downloadPhotoAsJpeg - loadImage'));
      img.src = objectUrl;
    });

    // 使用 Canvas 转换为 JPEG
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw ErrorFactory.wrap(new Error('无法创建 Canvas 上下文'), 'downloadPhotoAsJpeg - canvasContext');
    
    // 填充白色背景（防止透明转 JPEG 变黑）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // 触发下载
    // 转换为 jpeg 数据 URL
    const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = jpegUrl;
    link.download = finalFilename.endsWith('.jpg') ? finalFilename : `${finalFilename}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 资源清理
    URL.revokeObjectURL(objectUrl);
    toast.success('已开始下载', { id: toastId });
  } catch (error: unknown) {
    console.error('Download failed:', error);
    const msg = error instanceof Error ? error.message : String(error);
    toast.error(`下载失败: ${msg || '请尝试长按图片保存'}`, { id: toastId });
  }
}
