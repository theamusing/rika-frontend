
const DB_NAME = 'rika-db';
const STORE_NAME = 'spritesheets';
const ASSET_STORE_NAME = 'image-assets';
const DB_VERSION = 2;

export interface CachedSprite {
  gen_id: string;
  spriteSheet: string;
  excludedIndices: number[];
  updatedAt: number;
}

export interface CachedAsset {
  url: string;
  data: string; // Base64 data URL
  updatedAt: number;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'gen_id' });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        db.createObjectStore(ASSET_STORE_NAME, { keyPath: 'url' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveSpriteToCache = async (data: CachedSprite): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSpriteFromCache = async (genId: string): Promise<CachedSprite | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(genId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const saveAssetToCache = async (url: string, data: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(ASSET_STORE_NAME);
    const request = store.put({ url, data, updatedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAssetFromCache = async (url: string): Promise<string | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE_NAME, 'readonly');
    const store = transaction.objectStore(ASSET_STORE_NAME);
    const request = store.get(url);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
};
