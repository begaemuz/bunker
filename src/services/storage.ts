import type { Profile } from '../game/profile/Profile';
import { migrate } from './migrations';

// Прогресс хранится в IndexedDB. Небольшие настройки — в LocalStorage.
// Формат — обычный JSON-объект профиля: его можно без переделки
// отправить на сервер для облачных сохранений.

const DB_NAME = 'bunker-last-signal';
const DB_VERSION = 1;
const STORE = 'saves';
const KEY = 'profile';
const BACKUP_KEY = 'bls-profile-backup';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступна'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function loadProfile(): Promise<Profile | null> {
  try {
    const db = await openDb();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (raw) return migrate(raw);
  } catch {
    // Падаем на резервную копию ниже.
  }
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) return migrate(JSON.parse(backup));
  } catch {
    /* нет резервной копии */
  }
  return null;
}

export async function saveProfile(p: Profile): Promise<void> {
  const data = { ...p, updatedAt: Date.now() };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    saveBackupSync(p);
  }
}

/**
 * Синхронная резервная копия в LocalStorage. Используется при закрытии
 * страницы, когда асинхронная запись в IndexedDB может не успеть.
 */
export function saveBackupSync(p: Profile): void {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ ...p, updatedAt: Date.now() }));
  } catch {
    /* хранилище переполнено — основная копия в IndexedDB */
  }
}

export async function clearProfile(): Promise<void> {
  try {
    localStorage.removeItem(BACKUP_KEY);
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

// ── Настройки (LocalStorage) ──
export interface Settings {
  speed: number;
  showDamageNumbers: boolean;
  soundOn: boolean;
}
const SETTINGS_KEY = 'bls-settings';
const defaultSettings: Settings = { speed: 1, showDamageNumbers: true, soundOn: true };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...defaultSettings };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
