import { useEffect, useMemo } from 'react';
import { techConfig } from '../game/config/techConfig';
import { upgradeBlock } from '../game/items/ItemUpgrade';
import { upgradeHints } from '../game/bunker/compare';
import { researchBlock } from '../game/progression/TechnologyTree';
import { SLOT_IDS } from '../game/types';
import { setSoundEnabled, setVolumes } from '../services/sound';
import { useProfile } from '../stores/profileStore';
import { useUi, type Screen } from '../stores/uiStore';
import { BunkerScreen } from '../components/bunker/BunkerScreen';
import { Toasts } from '../components/common/Common';
import { UiIcon } from '../components/common/Icons';
import { NickDialog, ProfileSheet } from '../components/player/ProfileSheet';
import { GameScreen } from '../components/game/GameScreen';
import { MenuScreen } from '../components/game/MenuScreen';
import { BossRewardModal, OfflineRewardModal, ResultScreen } from '../components/game/ResultScreen';
import { Intro } from '../components/intro/Intro';
import { introSeen } from '../services/storage';
import { LocationsScreen } from '../components/locations/LocationsScreen';
import { TechScreen } from '../components/tech/TechScreen';
import { ShopScreen } from '../components/shop/ShopScreen';
import { LoginSheet, QuestsSheet } from '../components/shop/QuestsSheet';

const navItems: { id: Screen; label: string; icon: 'battle' | 'bunker' | 'tech' | 'shop' | 'map' | 'menu' }[] = [
  { id: 'game', label: 'Бой', icon: 'battle' },
  { id: 'bunker', label: 'Бункер', icon: 'bunker' },
  { id: 'tech', label: 'Наука', icon: 'tech' },
  { id: 'shop', label: 'Магазин', icon: 'shop' },
  { id: 'locations', label: 'Локации', icon: 'map' },
];

export function App() {
  const loaded = useProfile((s) => s.loaded);
  const init = useProfile((s) => s.init);

  useEffect(() => {
    const st = useUi.getState().settings;
    setSoundEnabled(st.soundOn);
    setVolumes({ master: st.masterVol, sfx: st.sfxVol, music: st.musicVol });
    void init();
  }, [init]);

  if (!loaded) return <div className="loading">BUNKER: LAST SIGNAL</div>;
  return <Main />;
}

function Main() {
  const screen = useUi((s) => s.screen);
  const introOpen = useUi((s) => s.introOpen);
  const questsOpen = useUi((s) => s.questsOpen);
  const setQuestsOpen = useUi((s) => s.setQuestsOpen);
  const profileOpen = useUi((s) => s.profileOpen);
  const loginOpen = useUi((s) => s.loginOpen);
  const setLoginOpen = useUi((s) => s.setLoginOpen);
  const setProfileOpen = useUi((s) => s.setProfileOpen);
  const setIntroOpen = useUi((s) => s.setIntroOpen);
  useEffect(() => {
    const p = useProfile.getState().profile!;
    if (!introSeen() && p.stats.robotsKilled < 5) setIntroOpen(true);
  }, [setIntroOpen]);
  const setScreen = useUi((s) => s.setScreen);
  const result = useUi((s) => s.result);
  const profile = useProfile((s) => s.profile)!;
  const tgName = useProfile((s) => s.tg?.first_name);
  const setPlayer = useProfile((s) => s.setPlayer);
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
        {screen === 'shop' && <ShopScreen />}
        {screen === 'locations' && <LocationsScreen />}
        {screen === 'menu' && <MenuScreen />}
        {result && <ResultScreen />}
        {questsOpen && <QuestsSheet onClose={() => setQuestsOpen(false)} />}
        {loginOpen && <LoginSheet onClose={() => setLoginOpen(false)} />}
        {profileOpen && <ProfileSheet onClose={() => setProfileOpen(false)} />}
        <BossRewardModal />
        {!introOpen && <OfflineRewardModal />}
        {!introOpen && !profile.player.nick && (
          <NickDialog
            title="Как зовут командира бункера?"
            initial={tgName ?? ''}
            onSave={(n) => {
              setPlayer({ nick: n });
            }}
          />
        )}
        <Toasts />
      </div>
      {introOpen && <Intro onDone={() => setIntroOpen(false)} />}
      {!result && !introOpen && (
        <nav className="nav">
          {navItems.map((n) => (
            <button key={n.id} className={screen === n.id ? 'on' : ''} onClick={() => setScreen(n.id)}>
              <span className="nav-ic">
                <UiIcon kind={n.icon} size={22} />
                {n.id === 'tech' && canResearch && <span className="nav-dot" />}
                {n.id === 'bunker' && better > 0 && <span className="nav-badge good">{better}</span>}
                {n.id === 'bunker' && better === 0 && canUpgrade && <span className="nav-dot" />}
              </span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
