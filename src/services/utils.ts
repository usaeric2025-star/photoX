import SparkMD5 from 'spark-md5';
import { supabase } from './client';

export const calculateMD5 = (base64Data: string): string => {
  try {
    const base64Content = base64Data.split(',')[1];
    return SparkMD5.hashBinary(atob(base64Content));
  } catch (e) {
    console.error("MD5 calculation error:", e);
    return `ERR-${Date.now()}`;
  }
};

export const calculateMD5FromFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        spark.append(e.target.result);
        resolve(spark.end());
      } else {
        reject(new Error('File read result is not ArrayBuffer'));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

export const calculateMD5FromArrayBuffer = (buffer: ArrayBuffer): string => {
  return SparkMD5.ArrayBuffer.hash(buffer);
};

export const generateItemCode = (): string => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FUR-${date}-${random}`;
};

/**
 * Get a fresh UUID from the database
 */
export const getDatabaseUUID = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_uuid_v4');
  if (!error && data) return data;
  return crypto.randomUUID(); 
};
