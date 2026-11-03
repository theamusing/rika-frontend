const DB_NAME = 'rika-db';
const STORE_NAME = 'spritesheets';
const ASSET_STORE_NAME = 'image-assets';
const DB_VERSION = 2;

export interface CachedSprite {
  gen_id: string;
  spriteSheet: string;
  excludedIndices?: number[];
  updatedAt: number;
  customData?: any;
}
export interface CachedAsset { url: string; data: string; updatedAt: number; }

let opening: Promise<IDBDatabase> | null = null;
export const initDB = (): Promise<IDBDatabase> => {
  if (opening) return opening;
  opening = new Promise<IDBDatabase>((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => { expired = true; reject(new Error('Local storage timed out')); }, 5000);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      for (const [name, keyPath] of [[STORE_NAME, 'gen_id'], [ASSET_STORE_NAME, 'url']]) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath });
      }
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      const db = request.result;
      if (expired) { db.close(); return; }
      db.onversionchange = () => { db.close(); opening = null; };
      db.onclose = () => { opening = null; };
      resolve(db);
    };
    request.onerror = () => { clearTimeout(timer); reject(request.error); };
    request.onblocked = () => { expired = true; clearTimeout(timer); reject(new Error('Local storage is blocked by another tab')); };
  });
  void opening.catch(() => { opening = null; });
  return opening;
};

// Wait for the commit; put-success alone does not guarantee a durable write.
const transaction = async <T>(storeName: string, mode: IDBTransactionMode,
  run: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> => {
  const db = await initDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    let value: T;
    const timer = setTimeout(() => { try { tx.abort(); } catch {} reject(new Error('Local storage transaction timed out')); }, 5000);
    tx.oncomplete = () => { clearTimeout(timer); resolve(value); };
    tx.onerror = tx.onabort = () => { clearTimeout(timer); reject(tx.error || new Error('Local storage transaction failed')); };
    try { run(tx.objectStore(storeName), next => { value = next; }); }
    catch (error) { clearTimeout(timer); try { tx.abort(); } catch {} reject(error); }
  });
};

export const saveSpriteToCache = (data: CachedSprite): Promise<void> =>
  transaction(STORE_NAME, 'readwrite', store => { store.put(data); });

export const getSpriteFromCache = (genId: string): Promise<CachedSprite | null> =>
  transaction(STORE_NAME, 'readonly', (store, result) => {
    store.get(genId).onsuccess = event => result((event.target as IDBRequest).result || null);
  });

export const createSpriteCacheIfAbsent = (data: CachedSprite): Promise<CachedSprite> =>
  transaction(STORE_NAME, 'readwrite', (store, result) => {
    store.get(data.gen_id).onsuccess = event => {
      const existing = (event.target as IDBRequest).result;
      if (!existing) store.put(data);
      result(existing || data);
    };
  });

/** Keep a recovery copy and never overwrite an edit made by another tab. */
export const recoverSpriteCache = (data: CachedSprite, expected: CachedSprite): Promise<CachedSprite> =>
  transaction(STORE_NAME, 'readwrite', (store, result) => {
    store.get(data.gen_id).onsuccess = event => {
      const current: CachedSprite | undefined = (event.target as IDBRequest).result;
      if (current && (current.updatedAt !== expected.updatedAt || current.spriteSheet !== expected.spriteSheet)) {
        result(current); return;
      }
      if (current) store.put({ ...current,
        gen_id: `recovery:${data.gen_id}:${Date.now()}`,
        customData: { ...current.customData, recoveryOf: data.gen_id },
      });
      store.put(data);
      result(data);
    };
  });

export const saveAssetToCache = (url: string, data: string): Promise<void> =>
  transaction(ASSET_STORE_NAME, 'readwrite', store => { store.put({ url, data, updatedAt: Date.now() }); });

export const getAssetFromCache = (url: string): Promise<string | null> =>
  transaction(ASSET_STORE_NAME, 'readonly', (store, result) => {
    store.get(url).onsuccess = event => result((event.target as IDBRequest).result?.data || null);
  });

export const deleteAssetFromCache = (url: string, expected: string): Promise<void> =>
  transaction(ASSET_STORE_NAME, 'readwrite', store => {
    store.get(url).onsuccess = event => {
      if ((event.target as IDBRequest).result?.data === expected) store.delete(url);
    };
  });
