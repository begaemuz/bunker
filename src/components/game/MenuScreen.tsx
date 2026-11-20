import { useUi } from '../../stores/uiStore';
import { Switch } from '../common/Common';

export function MenuScreen() {
  const settings = useUi((s) => s.settings);
  const toggleSound = useUi((s) => s.toggleSound);
  const setVolume = useUi((s) => s.setVolume);
  const toggleNumbers = useUi((s) => s.toggleDamageNumbers);
  const toggleToasts = useUi((s) => s.toggleToasts);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="grow">Настройки</h2>
      </div>
      <div className="screen-body">
        <div className="section-title" style={{ marginTop: 0 }}>
          Звук
        </div>
        <div className="menu-list">
          <div className="toggle-row">
            <span>Звук</span>
            <Switch on={settings.soundOn} onChange={toggleSound} />
          </div>
          {(
            [
              ['masterVol', 'Общая громкость'],
              ['sfxVol', 'Эффекты'],
              ['musicVol', 'Музыка'],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, opacity: settings.soundOn ? 1 : 0.5 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{label}</span>
                <b>{Math.round(settings[k] * 100)}%</b>
              </span>
              <input className="range" type="range" min={0} max={1} step={0.05} value={settings[k]} onChange={(e) => setVolume(k, Number(e.target.value))} />
            </div>
          ))}
        </div>

        <div className="section-title">Игра</div>
        <div className="menu-list">
          <div className="toggle-row">
            <span>
              Числа урона
              <br />
              <span className="small muted">Цифры над роботами при попадании</span>
            </span>
            <Switch on={settings.showDamageNumbers} onChange={toggleNumbers} />
          </div>
          <div className="toggle-row">
            <span>
              Всплывающие уведомления
              <br />
              <span className="small muted">Сообщения о наградах и событиях. Ошибки показываются всегда</span>
            </span>
            <Switch on={settings.showToasts} onChange={toggleToasts} />
          </div>
        </div>
      </div>
    </div>
  );
}
