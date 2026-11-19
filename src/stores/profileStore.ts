import { create } from 'zustand';
import type { Loot } from '../game/economy/DropSystem';
import {
  addItems,
  addResources,
  addXp,
  createNewProfile,
  equipItem,
  sellItem,
  unequipItem,
  type GlobalStats,
  type Profile,
} from '../game/profile/Profile';
import type { EquipCategory } from '../game/types';
import { clearProfile, loadProfile, saveBackupSync, saveProfile } from '../services/storage';

interface ProfileState {
  profile: Profile | null;
  loaded: boolean;
  /** Увеличивается при каждом изменении экипировки/уровня — движок пересчитывает характеристики. */
  statsVersion: number;
  init: () => Promise<void>;
  applyLoot: (loot: Loot, xp: number) => number;
  addStats: (delta: Partial<GlobalStats>) => void;
  setMapProgress: (mapId: number, wave: number, bossKilled: boolean) => void;
  equip: (itemId: string, category: EquipCategory, slot?: number) => string | null;
  unequip: (itemId: string) => void;
  sell: (itemId: string) => { coins: number; error?: string };
  reset: () => Promise<void>;
  saveNow: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(get: () => ProfileState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const p = get().profile;
    if (p) void saveProfile(p);
  }, 300);
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  loaded: false,
  statsVersion: 0,

  init: async () => {
    if (get().loaded) return;
    const loaded = await loadProfile();
    const profile = loaded ?? createNewProfile();
    set({ profile, loaded: true });
    if (!loaded) void saveProfile(profile);
    installLifecycleSaves(get);
  },

  applyLoot: (loot, xp) => {
    let p = get().profile;
    if (!p) return 0;
    p = addResources(p, loot.resources);
    if (loot.items.length) p = addItems(p, loot.items).profile;
    const lv = addXp(p, xp);
    p = lv.profile;
    p = { ...p, stats: { ...p.stats, robotsKilled: p.stats.robotsKilled + 1 } };
    set((s) => ({ profile: p, statsVersion: lv.levelsGained > 0 ? s.statsVersion + 1 : s.statsVersion }));
    // Сохраняем сразу после получения предмета; ресурсы — пачкой.
    scheduleSave(get);
    return lv.levelsGained;
  },

  addStats: (delta) => {
    const p = get().profile;
    if (!p) return;
    const stats = { ...p.stats };
    for (const [k, v] of Object.entries(delta) as [keyof GlobalStats, number][]) stats[k] += v;
    set({ profile: { ...p, stats } });
    scheduleSave(get);
  },

  setMapProgress: (mapId, wave, bossKilled) => {
    const p = get().profile;
    if (!p) return;
    const maps = {
      ...p.maps,
      bestWave: { ...p.maps.bestWave, [mapId]: Math.max(p.maps.bestWave[mapId] ?? 0, wave) },
      bossKills: { ...p.maps.bossKills, [mapId]: (p.maps.bossKills[mapId] ?? 0) + (bossKilled ? 1 : 0) },
    };
    set({ profile: { ...p, maps } });
    scheduleSave(get);
  },

  equip: (itemId, category, slot) => {
    const p = get().profile;
    if (!p) return 'not_loaded';
    const r = equipItem(p, itemId, category, slot);
    if (r.error) return r.error;
    set((s) => ({ profile: r.profile, statsVersion: s.statsVersion + 1 }));
    scheduleSave(get);
    return null;
  },

  unequip: (itemId) => {
    const p = get().profile;
    if (!p) return;
    set((s) => ({ profile: unequipItem(p, itemId), statsVersion: s.statsVersion + 1 }));
    scheduleSave(get);
  },

  sell: (itemId) => {
    const p = get().profile;
    if (!p) return { coins: 0, error: 'not_loaded' };
    const r = sellItem(p, itemId);
    if (r.error) return { coins: 0, error: r.error };
    set({ profile: r.profile });
    scheduleSave(get);
    return { coins: r.coins };
  },

  reset: async () => {
    await clearProfile();
    const profile = createNewProfile();
    set((s) => ({ profile, statsVersion: s.statsVersion + 1 }));
    await saveProfile(profile);
  },

  saveNow: async () => {
    const p = get().profile;
    if (p) await saveProfile(p);
  },
}));

let lifecycleInstalled = false;
function installLifecycleSaves(get: () => ProfileState): void {
  if (lifecycleInstalled || typeof window === 'undefined') return;
  lifecycleInstalled = true;
  const flush = () => {
    const p = get().profile;
    if (!p) return;
    saveBackupSync(p);
    void saveProfile(p);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
  window.addEventListener('pagehide', flush);
  // Периодическое автосохранение.
  setInterval(() => {
    const p = get().profile;
    if (p) void saveProfile(p);
  }, 15_000);
}
