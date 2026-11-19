import { useEffect } from 'react';
import { isEquipped } from '../game/profile/Profile';
import { setSoundEnabled } from '../services/sound';
import { useProfile } from '../stores/profileStore';
import { useUi, type Screen } from '../stores/uiStore';
import { Toasts } from '../components/common/Common';
import { UiIcon } from '../components/common/Icons';
import { EquipmentScreen } from '../components/equipment/EquipmentScreen';
import { GameScreen } from '../components/game/GameScreen';
import { MenuScreen } from '../components/game/MenuScreen';
import { ResultScreen } from '../components/game/ResultScreen';
import { InventoryScreen } from '../components/inventory/InventoryScreen';

const navItems: { id: Screen; label: string; icon: 'battle' | 'inventory' | 'equipment' | 'menu' }[] = [
  { id: 'game', label: 'Бой', icon: 'battle' },
  { id: 'inventory', label: 'Инвентарь', icon: 'inventory' },
  { id: 'equipment', label: 'Экипировка', icon: 'equipment' },
  { id: 'menu', label: 'Меню', icon: 'menu' },
];

export function App() {
  const loaded = useProfile((s) => s.loaded);
  const init = useProfile((s) => s.init);

  useEffect(() => {
    setSoundEnabled(useUi.getState().settings.soundOn);
    void init();
  }, [init]);

  if (!loaded) return <div className="loading">BUNKER: LAST SIGNAL</div>;
  return <Main />;
}

function Main() {
  const screen = useUi((s) => s.screen);
  const setScreen = useUi((s) => s.setScreen);
  const result = useUi((s) => s.result);
  // Счётчик неустановленного оборудования на кнопке инвентаря.
  const spare = useProfile((s) => {
    const p = s.profile!;
    return Object.keys(p.items).filter((id) => !isEquipped(p, id)).length;
  });

  return (
    <div className="app">
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <GameScreen />
        {screen === 'inventory' && <InventoryScreen />}
        {screen === 'equipment' && <EquipmentScreen />}
        {screen === 'menu' && <MenuScreen />}
        {result && <ResultScreen />}
        <Toasts />
      </div>
      {!result && (
        <nav className="nav">
          {navItems.map((n) => (
            <button key={n.id} className={screen === n.id ? 'on' : ''} onClick={() => setScreen(n.id)}>
              <UiIcon kind={n.icon} />
              {n.label}
              {n.id === 'inventory' && spare > 0 && <span className="nav-badge">{spare}</span>}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
