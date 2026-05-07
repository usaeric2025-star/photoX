import { Photo } from '../types';

const DB_NAME = 'ProductAlbumDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveData = async (key: string, data: any) => {
  const db = await initDB();
  const wrapper = {
    _data: data,
    savedAt: Date.now()
  };
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(wrapper, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadData = async (key: string) => {
  const db = await initDB();
  return new Promise<any>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      const res = request.result;
      if (res && typeof res === 'object' && 'savedAt' in res && '_data' in res) {
        resolve(res._data);
      } else {
        resolve(res);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearExpiredCaches = async (expireDays = 7) => {
  const db = await initDB();
  const expireMs = expireDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        const key = cursor.key as string;
        const data = cursor.value;
        if (key.startsWith('product_') && data && data.savedAt && (now - data.savedAt > expireMs)) {
          console.log(`[IndexedDB] Clearing expired cache: ${key}`);
          store.delete(key);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
};
