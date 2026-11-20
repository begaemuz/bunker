import { LANGS, currentLang, setLang, type Lang } from '../../i18n/lang';

/** Выбор языка: первым экраном и в настройках. */
export function LanguageButtons({ onPick }: { onPick?: (l: Lang) => void }) {
  const cur = currentLang();
  return (
    <div className="lang-btns">
      {LANGS.map((l) => (
        <button key={l.id} className={`lang-btn${cur === l.id ? ' on' : ''}`} onClick={() => (onPick ? onPick(l.id) : l.id !== cur && setLang(l.id))}>
          <span className="lang-flag">{l.flag}</span>
          {l.name}
        </button>
      ))}
    </div>
  );
}

/** Первый запуск: язык до вступления. Подписи на обоих языках, без перевода. */
export function FirstLanguage() {
  return (
    <div className="lang-first">
      <div className="lang-card">
        <div className="lang-title" translate="no">
          Язык · Language
        </div>
        <LanguageButtons onPick={(l) => setLang(l)} />
      </div>
    </div>
  );
}
