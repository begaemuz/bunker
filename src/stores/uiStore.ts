import { create } from 'zustand';
import type { Loot } from '../game/economy/DropSystem';
import type { EngineMode, EngineState, RunStats } from '../game/engine/GameEngine';
import type { CoilMode, Item, SlotId } from '../game/types';
import { loadSettings, saveSettings, type Settings } from '../services/storage';
import { setSoundEnabled, setVolumes } from '../services/sound';

export type Screen = 'game' | 'bunker' | 'tech' | 'shop' | 'locations' | 'menu';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'rare';
}

export interface CoilHud {
  name: string;
  mode: CoilMode;
  /** Готовность импульса 0..1. */
  charge: number;
  blocked: 'energy' | 'heat' | 'jammed' | 'target' | null;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  energy: number;
  capacity: number;
  heat: number;
  heatCap: number;
  overheated: boolean;
  coils: (CoilHud | null)[];
  dps: number;
  kills: number;
  alive: number;
  runCoins: number;
  threat: number;
  mode: EngineMode;
  boss: { name: string; hp: number; maxHp: number; shield: number; maxShield: number } | null;
  suppressed: boolean;
  recentDrops: Item[];
  state: EngineState;
}

export interface RunResult {
  locationId: number;
  duringBoss: boolean;
  run: RunStats;
}

export interface BossReward {
  locationId: number;
  bossName: string;
  loot: Loot;
  unlocked: number | null;
}

interface UiState {
  screen: Screen;
  paused: boolean;
  settings: Settings;
  selectedItemId: string | null;
  /** Слот, для которого выбирается оборудование. */
  equipTarget: SlotId | null;
  hud: HudSnapshot | null;
  result: RunResult | null;
  bossReward: BossReward | null;
  toasts: Toast[];
  runId: number;
  introOpen: boolean;
  setIntroOpen: (o: boolean) => void;
  questsOpen: boolean;
  setQuestsOpen: (o: boolean) => void;

  setScreen: (s: Screen) => void;
  setPaused: (p: boolean) => void;
  setSpeed: (s: number) => void;
  toggleDamageNumbers: () => void;
  toggleSound: () => void;
  setVolume: (k: 'masterVol' | 'sfxVol' | 'musicVol', v: number) => void;
  selectItem: (id: string | null) => void;
  setEquipTarget: (t: SlotId | null) => void;
  setHud: (h: HudSnapshot) => void;
  setResult: (r: RunResult | null) => void;
  setBossReward: (r: BossReward | null) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  newRun: () => void;
}

let toastId = 1;

export const useUi = create<UiState>((set, get) => ({
  screen: 'game',
  paused: false,
  settings: loadSettings(),
  selectedItemId: null,
  equipTarget: null,
  hud: null,
  result: null,
  bossReward: null,
  toasts: [],
  runId: 1,
  introOpen: false,
  setIntroOpen: (introOpen) => set({ introOpen }),
  questsOpen: false,
  setQuestsOpen: (questsOpen) => set({ questsOpen }),

  setScreen: (screen) => set({ screen, selectedItemId: null, equipTarget: null }),
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => {
    const settings = { ...get().settings, speed };
    saveSettings(settings);
    set({ settings });
  },
  toggleDamageNumbers: () => {
    const settings = { ...get().settings, showDamageNumbers: !get().settings.showDamageNumbers };
    saveSettings(settings);
    set({ settings });
  },
  toggleSound: () => {
    const settings = { ...get().settings, soundOn: !get().settings.soundOn };
    saveSettings(settings);
    setSoundEnabled(settings.soundOn);
    set({ settings });
  },
  setVolume: (k, v) => {
    const settings = { ...get().settings, [k]: v };
    saveSettings(settings);
    setVolumes({ master: settings.masterVol, sfx: settings.sfxVol, music: settings.musicVol });
    set({ settings });
  },
  selectItem: (selectedItemId) => set({ selectedItemId }),
  setEquipTarget: (equipTarget) => set({ equipTarget }),
  setHud: (hud) => set({ hud }),
  setResult: (result) => set({ result }),
  setBossReward: (bossReward) => set({ bossReward }),
  toast: (text, tone = 'info') => {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-2), { id, text, tone }] });
    setTimeout(() => get().dismissToast(id), 2600);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  newRun: () => set({ runId: get().runId + 1, result: null, paused: false, screen: 'game' }),
}));
