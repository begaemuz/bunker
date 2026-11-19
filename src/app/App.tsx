import { useEffect, useMemo } from 'react';
import { techConfig } from '../game/config/techConfig';
import { upgradeBlock } from '../game/items/ItemUpgrade';
import { upgradeHints } from '../game/bunker/compare';
import { researchBlock } from '../game/progression/TechnologyTree';
import { SLOT_IDS } from '../game/types';
import { setSoundEnabled } from '../services/sound';
import { useProfile } from '../stores/profileStore';
import { useUi, type Screen } from '../stores/uiStore';
import { BunkerScreen } from '../components/bunker/BunkerScreen';
import { Toasts } from '../components/common/Common';
import { UiIcon } from '../components/common/Icons';
import { GameScreen } from '../components/game/GameScreen';
import { MenuScreen } from '../components/game/MenuScreen';
import { BossRewardModal, ResultScreen } from '../components/game/ResultScreen';
import { LocationsScreen } from '../components/locations/LocationsScreen';
import { TechScreen } from '../components/tech/TechScreen';

const navItems: { id: Screen; label: string; icon: 'battle' | 'bunker' | 'tech' | 'map' | 'menu' }[] = [
  { id: 'game', label: 'Бой', icon: 'battle' },
  { id: 'bunker', label: 'Бункер', icon: 'bunker' },
  { id: 'tech', label: 'Наука', icon: 'tech' },
  { id: 'locations', label: 'Локации', icon: 'map' },
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
  const profile = useProfile((s) => s.profile)!;
  const better = useMemo(() => upgradeHints(profile).size, [profile]);
  const canResearch = useProfile((s) => techConfig.some((t) => !researchBlock(s.profile!, t)));
  const canUpgrade = useProfile((s) => {
    const p = s.profile!;
    return SLOT_IDS.some((slot) => {
      const id = p.equipment[slot];
      return id ? !upgradeBlock(p, p.items[id], false) : false;
    });
  });

  return (
    <div className="app">
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <GameScreen />
        {screen === 'bunker' && <BunkerScreen />}
        {screen === 'tech' && <TechScreen />}
        {screen === 'locations' && <LocationsScreen />}
        {screen === 'menu' && <MenuScreen />}
        {result && <ResultScreen />}
        <BossRewardModal />
        <Toasts />
      </div>
      {!result && (
        <nav className="nav">
          {navItems.map((n) => (
            <button key={n.id} className={screen === n.id ? 'on' : ''} onClick={() => setScreen(n.id)}>
              <UiIcon kind={n.icon} />
              {n.label}

              {n.id === 'tech' && canResearch && <span className="nav-dot" />}
              {n.id === 'bunker' && better > 0 && <span className="nav-badge" style={{ background: 'linear-gradient(#7be38a, #2f9a3c)', boxShadow: '0 0 6px rgba(95,209,106,0.8)' }}>{better}</span>}
              {n.id === 'bunker' && better === 0 && canUpgrade && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
