// Язык интерфейса. Русский — исходный; английский переводится на лету:
// все надписи на экране сверяются со словарём (точные строки и шаблоны с числами).
import en from './en.json';
import enTpl from './en_tpl.json';

export type Lang = 'ru' | 'en';
export const LANGS: { id: Lang; name: string; flag: string }[] = [
  { id: 'ru', name: 'Русский', flag: '🇷🇺' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
];

const KEY = 'bls-lang';

export function savedLang(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'ru' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

export function currentLang(): Lang {
  return savedLang() ?? 'ru';
}

/** Сменить язык: сохраняем и перезагружаем интерфейс. */
export function setLang(l: Lang, reload = true): void {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* хранилище недоступно */
  }
  if (reload) location.reload();
}

const CYR = /[А-Яа-яЁё]/;
const exact = en as Record<string, string>;
const cache = new Map<string, string>();

interface Tpl {
  re: RegExp;
  out: string;
}
const templates: Tpl[] = Object.entries(enTpl as Record<string, string>)
  .sort((a, b) => b[0].replace(/\{\d+\}/g, '').length - a[0].replace(/\{\d+\}/g, '').length)
  .map(([ru, out]) => {
    const parts = ru.split(/(\{\d+\})/);
    const src = parts.map((p) => (/^\{\d+\}$/.test(p) ? '(.*?)' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('');
    return { re: new RegExp(`^${src}$`), out };
  });

function translateCore(s: string, depth = 0): string {
  const hit = exact[s];
  if (hit !== undefined) return hit;
  if (depth > 2) return s;
  // «Название ×3», «+5 Название» и части через « · » переводим по кусочкам.
  const mult = /^(.*?)( ×[\d.,]+[KMBT]?)$/.exec(s);
  if (mult && exact[mult[1]] !== undefined) return exact[mult[1]] + mult[2];
  for (const t of templates) {
    const m = t.re.exec(s);
    if (!m) continue;
    return t.out.replace(/\{(\d+)\}/g, (_, i) => {
      const v = m[Number(i) + 1] ?? '';
      return CYR.test(v) ? translateCore(v.trim(), depth + 1) : v;
    });
  }
  if (s.includes(' · ')) {
    const parts = s.split(' · ');
    const out = parts.map((x) => (CYR.test(x) ? translateCore(x.trim(), depth + 1) : x));
    if (out.some((x, i) => x !== parts[i])) return out.join(' · ');
  }
  return s;
}

/** Перевод строки (с сохранением пробелов по краям). */
export function tr(s: string): string {
  if (!CYR.test(s)) return s;
  const c = cache.get(s);
  if (c !== undefined) return c;
  const lead = s.match(/^\s*/)![0];
  const tail = s.match(/\s*$/)![0];
  const core = s.trim().replace(/\s+/g, ' ');
  const out = lead + translateCore(core) + tail;
  cache.set(s, out);
  return out;
}

const ATTRS = ['placeholder', 'aria-label', 'title'];

function translateNode(n: Node): void {
  if (n.nodeType === Node.TEXT_NODE) {
    const t = n.nodeValue ?? '';
    if (CYR.test(t)) {
      const v = tr(t);
      if (v !== t) n.nodeValue = v;
    }
    return;
  }
  if (n.nodeType !== Node.ELEMENT_NODE) return;
  const el = n as Element;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && CYR.test(v)) el.setAttribute(a, tr(v));
  }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let cur = walker.nextNode();
  while (cur) {
    if (cur.nodeType === Node.TEXT_NODE) translateNode(cur);
    else {
      const e = cur as Element;
      for (const a of ATTRS) {
        const v = e.getAttribute(a);
        if (v && CYR.test(v)) e.setAttribute(a, tr(v));
      }
    }
    cur = walker.nextNode();
  }
}

/** Включает перевод всего интерфейса (только для английского). */
export function startTranslation(): void {
  if (currentLang() === 'ru' || typeof document === 'undefined') return;
  document.documentElement.lang = 'en';
  translateNode(document.body);
  const obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') translateNode(m.target);
      else if (m.type === 'attributes') translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
    }
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
