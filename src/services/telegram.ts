// Интеграция с Telegram Mini App: автоматический вход по аккаунту Telegram,
// облачное сохранение (Telegram CloudStorage), тактильная отдача.
// Вне Telegram всё работает как обычная веб-игра.

export interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface CloudStorage {
  setItem(key: string, value: string, cb?: (err: unknown, ok?: boolean) => void): void;
  getItem(key: string, cb: (err: unknown, value?: string) => void): void;
  getItems(keys: string[], cb: (err: unknown, values?: Record<string, string>) => void): void;
  removeItems(keys: string[], cb?: (err: unknown, ok?: boolean) => void): void;
}

interface WebApp {
  initData: string;
  initDataUnsafe: { user?: TgUser; start_param?: string };
  version: string;
  platform: string;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  setBottomBarColor?(c: string): void;
  disableVerticalSwipes?(): void;
  enableClosingConfirmation?(): void;
  onEvent(e: string, cb: () => void): void;
  openInvoice?(url: string, cb?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void): void;
  CloudStorage?: CloudStorage;
  HapticFeedback?: {
    impactOccurred(s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(t: 'error' | 'success' | 'warning'): void;
  };
  safeAreaInset?: { top: number; bottom: number };
  contentSafeAreaInset?: { top: number; bottom: number };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
    TelegramWebviewProxy?: unknown;
  }
}

let app: WebApp | null = null;

/** Похоже ли, что игра открыта внутри Telegram. */
function inTelegram(): boolean {
  const h = location.hash + location.search;
  return h.includes('tgWebApp') || !!window.TelegramWebviewProxy || !!window.Telegram?.WebApp?.initData;
}

function loadScript(src: string, timeout = 4000): Promise<void> {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    const t = setTimeout(resolve, timeout);
    s.onload = () => {
      clearTimeout(t);
      resolve();
    };
    s.onerror = () => {
      clearTimeout(t);
      resolve();
    };
    document.head.appendChild(s);
  });
}

/** Подключает Telegram WebApp SDK (только внутри Telegram). */
export async function initTelegram(): Promise<WebApp | null> {
  if (!inTelegram()) return null;
  if (!window.Telegram?.WebApp) await loadScript('https://telegram.org/js/telegram-web-app.js');
  const wa = window.Telegram?.WebApp;
  if (!wa) return null;
  app = wa;
  try {
    wa.ready();
    wa.expand();
    wa.setHeaderColor?.('#0e1216');
    wa.setBackgroundColor?.('#0b0d10');
    wa.setBottomBarColor?.('#07090b');
    wa.disableVerticalSwipes?.();
    applySafeArea();
    wa.onEvent('safeAreaChanged', applySafeArea);
    wa.onEvent('contentSafeAreaChanged', applySafeArea);
  } catch {
    /* старые клиенты Telegram */
  }
  return wa;
}

function applySafeArea(): void {
  if (!app) return;
  const top = (app.safeAreaInset?.top ?? 0) + (app.contentSafeAreaInset?.top ?? 0);
  const bottom = (app.safeAreaInset?.bottom ?? 0) + (app.contentSafeAreaInset?.bottom ?? 0);
  const root = document.documentElement.style;
  if (top) root.setProperty('--safe-top', `${top}px`);
  if (bottom) root.setProperty('--safe-bottom', `${bottom}px`);
}

export function isTelegram(): boolean {
  return !!app;
}

export function tgUser(): TgUser | null {
  return app?.initDataUnsafe.user ?? null;
}

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void {
  const h = app?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === 'success' || kind === 'error') h.notificationOccurred(kind);
    else h.impactOccurred(kind);
  } catch {
    /* ignore */
  }
}

// ───────── Облачное сохранение ─────────
// В CloudStorage значение ключа ограничено 4096 символами,
// поэтому сохранение режется на части.

const CHUNK = 4000;
const META = 'save_meta';
const PART = (i: number) => `save_${i}`;

function cloud(): CloudStorage | null {
  if (!app?.CloudStorage) return null;
  try {
    return app.isVersionAtLeast('6.9') ? app.CloudStorage : null;
  } catch {
    return null;
  }
}

export function cloudAvailable(): boolean {
  return !!cloud();
}

const call = <T,>(fn: (cb: (err: unknown, v?: T) => void) => void): Promise<T | null> =>
  new Promise((resolve) => {
    try {
      fn((err, v) => resolve(err ? null : (v ?? null)));
    } catch {
      resolve(null);
    }
  });

export async function cloudLoad(): Promise<string | null> {
  const cs = cloud();
  if (!cs) return null;
  const metaRaw = await call<string>((cb) => cs.getItem(META, cb));
  if (!metaRaw) return null;
  let meta: { n: number };
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return null;
  }
  const keys = Array.from({ length: meta.n }, (_, i) => PART(i));
  const out: string[] = [];
  // getItems принимает ограниченное число ключей — читаем пачками.
  for (let i = 0; i < keys.length; i += 20) {
    const vals = await call<Record<string, string>>((cb) => cs.getItems(keys.slice(i, i + 20), cb));
    if (!vals) return null;
    for (const k of keys.slice(i, i + 20)) {
      if (typeof vals[k] !== 'string') return null;
      out.push(vals[k]);
    }
  }
  return out.join('');
}

let lastCloudN = 0;
let cloudBusy = false;

export async function cloudSave(json: string, updatedAt: number): Promise<boolean> {
  const cs = cloud();
  if (!cs || cloudBusy) return false;
  cloudBusy = true;
  try {
    const n = Math.ceil(json.length / CHUNK);
    if (n > 900) return false;
    for (let i = 0; i < n; i++) {
      const ok = await call<boolean>((cb) => cs.setItem(PART(i), json.slice(i * CHUNK, (i + 1) * CHUNK), cb));
      if (ok === null) return false;
    }
    await call<boolean>((cb) => cs.setItem(META, JSON.stringify({ n, updatedAt }), cb));
    if (lastCloudN > n) {
      const stale = Array.from({ length: lastCloudN - n }, (_, i) => PART(n + i));
      await call<boolean>((cb) => cs.removeItems(stale, cb));
    }
    lastCloudN = n;
    return true;
  } finally {
    cloudBusy = false;
  }
}

/** Подписанные данные запуска — сервер по ним проверяет игрока. */
export function tgInitData(): string {
  return app?.initData ?? '';
}

/** Открывает окно оплаты звёздами. Возвращает статус. */
export function openInvoice(url: string): Promise<'paid' | 'cancelled' | 'failed' | 'pending'> {
  return new Promise((res) => {
    if (!app?.openInvoice) return res('failed');
    app.openInvoice(url, (s) => res(s));
  });
}
