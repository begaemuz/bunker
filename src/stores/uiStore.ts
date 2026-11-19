import { create } from 'zustand';
import type { Item } from '../game/types';
import type { EngineState, RunStats } from '../game/engine/GameEngine';
import { loadSettings, saveSettings, type Settings } from '../services/storage';
import { setSoundEnabled } from '../services/sound';

export type Screen = 'game' | 'inventory' | 'equipment' | 'menu';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'rare';
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  wave: number;
  bossWave: number;
  phase: 'break' | 'spawning' | 'clearing';
  breakLeft: number;
  dps: number;
  kills: number;
  runCoins: number;
  battery: number;
  batteryCap: number;
  energyBalance: number;
  efficiency: number;
  boss: { name: string; hp: number; maxHp: number; shield: number; maxShield: number } | null;
  suppressed: boolean;
  recentDrops: Item[];
  state: EngineState;
  alive: number;
}

export interface RunResult {
  outcome: 'victory' | 'defeat';
  mapId: number;
  wave: number;
  run: RunStats;
}

interface UiState {
  screen: Screen;
  paused: boolean;
  menuOpen: boolean;
  settings: Settings;
  selectedItemId: string | null;
  /** Если открыто из слота экипировки — какой слот заменить. */
  equipTarget: { category: Item['category']; slot: number } | null;
  hud: HudSnapshot | null;
  result: RunResult | null;
  toasts: Toast[];
  /** Счётчик новых боёв — GameScreen пересоздаёт сессию. */
  runId: number;

  setScreen: (s: Screen) => void;
  setPaused: (p: boolean) => void;
  setMenu: (o: boolean) => void;
  setSpeed: (s: number) => void;
  toggleDamageNumbers: () => void;
  toggleSound: () => void;
  selectItem: (id: string | null) => void;
  setEquipTarget: (t: UiState['equipTarget']) => void;
  setHud: (h: HudSnapshot) => void;
  setResult: (r: RunResult | null) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  newRun: () => void;
}

let toastId = 1;

export const useUi = create<UiState>((set, get) => ({
  screen: 'game',
  paused: false,
  menuOpen: false,
  settings: loadSettings(),
  selectedItemId: null,
  equipTarget: null,
  hud: null,
  result: null,
  toasts: [],
  runId: 1,

  setScreen: (screen) => set({ screen, selectedItemId: null, equipTarget: screen === 'inventory' ? get().equipTarget : null }),
  setPaused: (paused) => set({ paused }),
  setMenu: (menuOpen) => set({ menuOpen }),
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
  selectItem: (selectedItemId) => set({ selectedItemId }),
  setEquipTarget: (equipTarget) => set({ equipTarget }),
  setHud: (hud) => set({ hud }),
  setResult: (result) => set({ result }),
  toast: (text, tone = 'info') => {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-3), { id, text, tone }] });
    setTimeout(() => get().dismissToast(id), 2600);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  newRun: () => set({ runId: get().runId + 1, result: null, paused: false, menuOpen: false, screen: 'game' }),
}));
