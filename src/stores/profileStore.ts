import { create } from 'zustand';
import type { Loot } from '../game/economy/DropSystem';
import { tryUpgrade, type UpgradeOutcome } from '../game/items/ItemUpgrade';
import {
  addGroupKill,
  addItems,
  addResources,
  addXp,
  consumeSummon,
  createNewProfile,
  ensureMinimumKit,
  equipItem,
  registerBossKill,
  restoreSummon,
  sellItem,
  setCurrentLocation,
  unequipItem,
  type GlobalStats,
  type Profile,
} from '../game/profile/Profile';
import { research } from '../game/progression/TechnologyTree';
import type { Item, SlotId } from '../game/types';
import { clearProfile, loadProfile, saveBackupSync, saveProfile } from '../services/storage';

interface ProfileState {
  profile: Profile | null;
  loaded: boolean;
  /** Растёт при любом изменении, влияющем на характеристики комплекса. */
  statsVersion: number;
  init: () => Promise<void>;
  applyLoot: (loot: Loot, xp: number) => number;
  addGroup: (locationId: number) => void;
  summon: (locationId: number, usePass: boolean) => boolean;
  refundSummon: (locationId: number, usedPass: boolean) => void;
  bossVictory: (locationId: number, loot: Loot) => number | null;
  addStats: (delta: Partial<GlobalStats>) => void;
  equip: (itemId: string, slot: SlotId) => string | null;
  unequip: (itemId: string) => void;
  sell: (itemId: string) => { coins: number; error?: string };
  upgrade: (itemId: string, useStabilizer: boolean) => { outcome?: UpgradeOutcome; error?: string; granted: Item[] };
  research: (techId: string) => string | null;
  setLocation: (id: number) => void;
  reset: () => Promise<void>;
  saveNow: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(get: () => ProfileState, immediate = false): void {
  if (saveTimer) clearTimeout(saveTimer);
  const run = () => {
    saveTimer = null;
    const p = get().profile;
    if (p) void saveProfile(p);
  };
  if (immediate) run();
  else saveTimer = setTimeout(run, 300);
}

export const useProfile = create<ProfileState>((set, get) => {
  /** Изменение профиля с автосохранением. */
  const commit = (profile: Profile, statsChanged = false, immediate = false) => {
    set((s) => ({ profile, statsVersion: statsChanged ? s.statsVersion + 1 : s.statsVersion }));
    scheduleSave(get, immediate);
  };

  return {
    profile: null,
    loaded: false,
    statsVersion: 0,

    init: async () => {
      if (get().loaded) return;
      const loaded = await loadProfile();
      const profile = ensureMinimumKit(loaded ?? createNewProfile()).profile;
      set({ profile, loaded: true });
      void saveProfile(profile);
      installLifecycleSaves(get);
    },

    applyLoot: (loot, xp) => {
      let p = get().profile;
      if (!p) return 0;
      p = addResources(p, loot.resources);
      if (loot.items.length) p = addItems(p, loot.items).profile;
      const lv = addXp(p, xp);
      p = { ...lv.profile, stats: { ...lv.profile.stats, robotsKilled: lv.profile.stats.robotsKilled + 1 } };
      commit(p, lv.levelsGained > 0, loot.items.length > 0);
      return lv.levelsGained;
    },

    addGroup: (locationId) => {
      const p = get().profile;
      if (p) commit(addGroupKill(p, locationId));
    },

    summon: (locationId, usePass) => {
      const p = get().profile;
      if (!p) return false;
      const q = consumeSummon(p, locationId, usePass);
      if (!q) return false;
      commit(q, false, true);
      return true;
    },

    refundSummon: (locationId, usedPass) => {
      const p = get().profile;
      if (p) commit(restoreSummon(p, locationId, usedPass), false, true);
    },

    bossVictory: (locationId, loot) => {
      let p = get().profile;
      if (!p) return null;
      p = addResources(p, loot.resources);
      p = addItems(p, loot.items).profile;
      const r = registerBossKill(p, locationId);
      commit(r.profile, false, true);
      return r.unlocked;
    },

    addStats: (delta) => {
      const p = get().profile;
      if (!p) return;
      const stats = { ...p.stats };
      for (const [k, v] of Object.entries(delta) as [keyof GlobalStats, number][]) stats[k] += v;
      commit({ ...p, stats });
    },

    equip: (itemId, slot) => {
      const p = get().profile;
      if (!p) return 'not_loaded';
      const r = equipItem(p, itemId, slot);
      if (r.error) return r.error;
      commit(r.profile, true, true);
      return null;
    },

    unequip: (itemId) => {
      const p = get().profile;
      if (p) commit(unequipItem(p, itemId), true, true);
    },

    sell: (itemId) => {
      const p = get().profile;
      if (!p) return { coins: 0, error: 'not_loaded' };
      const r = sellItem(p, itemId);
      if (r.error) return { coins: 0, error: r.error };
      commit(r.profile, false, true);
      return { coins: r.coins };
    },

    upgrade: (itemId, useStabilizer) => {
      const p = get().profile;
      if (!p) return { error: 'not_loaded', granted: [] };
      const r = tryUpgrade(p, itemId, useStabilizer);
      if (r.error) return { error: r.error, granted: [] };
      const kit = ensureMinimumKit(r.profile);
      commit(kit.profile, true, true);
      return { outcome: r.outcome, granted: kit.granted };
    },

    research: (techId) => {
      const p = get().profile;
      if (!p) return 'not_loaded';
      const r = research(p, techId);
      if (r.error) return r.error;
      commit(r.profile, true, true);
      return null;
    },

    setLocation: (id) => {
      const p = get().profile;
      if (p) commit(setCurrentLocation(p, id), false, true);
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
  };
});

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
  setInterval(() => {
    const p = get().profile;
    if (p) void saveProfile(p);
  }, 15_000);
}
