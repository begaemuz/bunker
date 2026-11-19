import { create } from 'zustand';
import { applyAutoSell } from '../game/economy/AutoSell';
import type { Loot } from '../game/economy/DropSystem';
import { tryUpgrade, type UpgradeOutcome } from '../game/items/ItemUpgrade';
import { addParts, fuseParts, installPart, unlockSlot, type InstallError } from '../game/items/Parts';
import {
  addGroupKill,
  addItems,
  addResources,
  addXp,
  consumeSummon,
  createNewProfile,
  ensureMinimumKit,
  equipItem,
  pushHistory,
  registerBossKill,
  restoreSummon,
  sellItem,
  setCurrentLocation,
  unequipItem,
  type GlobalStats,
  type OfflineRates,
  type Profile,
} from '../game/profile/Profile';
import { computeOfflineReward, type OfflineReward } from '../game/progression/offline';
import { research } from '../game/progression/TechnologyTree';
import type { Item, Part, Rarity, SlotId } from '../game/types';
import { migrate } from '../services/migrations';
import { clearProfile, loadProfile, saveBackupSync, saveProfile, setStorageUser } from '../services/storage';
import { cloudAvailable, cloudLoad, cloudSave, initTelegram, tgUser, type TgUser } from '../services/telegram';

interface ProfileState {
  profile: Profile | null;
  loaded: boolean;
  statsVersion: number;
  tg: TgUser | null;
  cloud: boolean;
  /** Награда за время отсутствия, ожидающая получения. */
  offlineReward: OfflineReward | null;
  init: () => Promise<void>;
  applyLoot: (loot: Loot, xp: number) => { levels: number; sold: Item[]; coins: number };
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
  setAutoSell: (r: Rarity | null) => void;
  installPart: (partId: string, itemId: string, slot: number) => InstallError | null;
  unlockSlot: (itemId: string, slot: number) => boolean;
  fuse: (partId: string) => { success?: boolean; result?: Part; error?: string };
  scrapPart: (partId: string) => number;
  setRates: (r: OfflineRates) => void;
  touch: () => void;
  checkOffline: () => void;
  claimOffline: () => { levels: number; sold: number };
  reset: () => Promise<void>;
  saveNow: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let cloudTimer: ReturnType<typeof setTimeout> | null = null;

function persistCloud(p: Profile, immediate = false): void {
  if (!cloudAvailable()) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  const run = () => {
    cloudTimer = null;
    void cloudSave(JSON.stringify(p), p.updatedAt);
  };
  if (immediate) run();
  else cloudTimer = setTimeout(run, 20_000);
}

function scheduleSave(get: () => ProfileState, immediate = false): void {
  if (saveTimer) clearTimeout(saveTimer);
  const run = () => {
    saveTimer = null;
    const p = get().profile;
    if (!p) return;
    void saveProfile(p);
    persistCloud(p);
  };
  if (immediate) run();
  else saveTimer = setTimeout(run, 300);
}

export const useProfile = create<ProfileState>((set, get) => {
  const commit = (profile: Profile, statsChanged = false, immediate = false) => {
    set((s) => ({ profile: { ...profile, updatedAt: Date.now() }, statsVersion: statsChanged ? s.statsVersion + 1 : s.statsVersion }));
    scheduleSave(get, immediate);
  };

  /** Добавление оборудования с учётом автопродажи. */
  const withItems = (p: Profile, items: Item[]) => {
    const auto = applyAutoSell(p, items);
    return { profile: auto.keep.length ? addItems(auto.profile, auto.keep).profile : auto.profile, sold: auto.sold, coins: auto.coins };
  };

  return {
    profile: null,
    loaded: false,
    statsVersion: 0,
    tg: null,
    cloud: false,
    offlineReward: null,

    init: async () => {
      if (get().loaded) return;
      await initTelegram();
      const user = tgUser();
      setStorageUser(user?.id ?? null);
      let profile = await loadProfile();
      // Облачная копия Telegram: берём более свежую.
      if (cloudAvailable()) {
        const raw = await cloudLoad();
        if (raw) {
          try {
            const remote = migrate(JSON.parse(raw));
            if (!profile || remote.updatedAt > profile.updatedAt) profile = remote;
          } catch {
            /* повреждённая облачная копия */
          }
        }
      }
      let p = ensureMinimumKit(profile ?? createNewProfile()).profile;
      if (user) p = { ...p, tgUserId: user.id };
      const offlineReward = computeOfflineReward(p);
      set({ profile: p, loaded: true, tg: user, cloud: cloudAvailable(), offlineReward });
      void saveProfile(p);
      persistCloud(p, true);
      installLifecycleSaves(get);
    },

    applyLoot: (loot, xp) => {
      let p = get().profile;
      if (!p) return { levels: 0, sold: [], coins: 0 };
      p = addResources(p, loot.resources);
      const r = withItems(p, loot.items);
      p = addParts(r.profile, loot.parts);
      const lv = addXp(p, xp);
      p = { ...lv.profile, stats: { ...lv.profile.stats, robotsKilled: lv.profile.stats.robotsKilled + 1 } };
      commit(p, lv.levelsGained > 0, loot.items.length + loot.parts.length > 0);
      return { levels: lv.levelsGained, sold: r.sold, coins: r.coins };
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
      p = addParts(addItems(p, loot.items).profile, loot.parts);
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

    setAutoSell: (maxRarity) => {
      const p = get().profile;
      if (p) commit({ ...p, autoSell: { maxRarity } }, false, true);
    },

    installPart: (partId, itemId, slot) => {
      const p = get().profile;
      if (!p) return 'not_found';
      const r = installPart(p, partId, itemId, slot);
      if (r.error) return r.error;
      commit(r.profile, true, true);
      return null;
    },

    unlockSlot: (itemId, slot) => {
      const p = get().profile;
      const q = p ? unlockSlot(p, itemId, slot) : null;
      if (!q) return false;
      commit(q, false, true);
      return true;
    },

    fuse: (partId) => {
      const p = get().profile;
      if (!p) return { error: 'not_loaded' };
      const r = fuseParts(p, partId);
      if (r.error) return { error: r.error };
      commit(r.profile, false, true);
      return { success: r.success, result: r.result };
    },

    scrapPart: (partId) => {
      const p = get().profile;
      const part = p?.parts[partId];
      if (!p || !part || part.installedIn) return 0;
      const scrap = 5 * (['common', 'uncommon', 'rare', 'epic', 'legendary', 'unique'].indexOf(part.rarity) + 1) ** 2;
      const parts = { ...p.parts };
      delete parts[partId];
      commit(
        {
          ...addResources({ ...p, parts }, { scrap }),
          history: pushHistory(p, { at: Date.now(), itemName: part.name, rarity: part.rarity, action: 'scrapped', detail: `+${scrap} металлолома` }),
        },
        false,
        true,
      );
      return scrap;
    },

    setRates: (rates) => {
      const p = get().profile;
      if (p) set({ profile: { ...p, offline: { ...p.offline, rates } } });
    },

    touch: () => {
      const p = get().profile;
      if (p) set({ profile: { ...p, offline: { ...p.offline, lastSeen: Date.now() } } });
    },

    checkOffline: () => {
      const p = get().profile;
      if (!p || get().offlineReward) return;
      const r = computeOfflineReward(p);
      if (r) set({ offlineReward: r });
    },

    claimOffline: () => {
      const r = get().offlineReward;
      let p = get().profile;
      if (!r || !p) return { levels: 0, sold: 0 };
      p = addResources(p, r.resources);
      const items = withItems(p, r.items);
      p = addParts(items.profile, r.parts);
      for (let i = 0; i < r.groups; i++) p = addGroupKill(p, r.location);
      const lv = addXp(p, r.xp);
      p = {
        ...lv.profile,
        offline: { ...lv.profile.offline, lastSeen: Date.now() },
        stats: { ...lv.profile.stats, robotsKilled: lv.profile.stats.robotsKilled + r.kills, playTime: lv.profile.stats.playTime + r.seconds },
      };
      set({ offlineReward: null });
      commit(p, lv.levelsGained > 0, true);
      return { levels: lv.levelsGained, sold: items.sold.length };
    },

    reset: async () => {
      await clearProfile();
      let profile = createNewProfile();
      const u = get().tg;
      if (u) profile = { ...profile, tgUserId: u.id };
      set((s) => ({ profile, statsVersion: s.statsVersion + 1, offlineReward: null }));
      await saveProfile(profile);
      persistCloud(profile, true);
    },

    saveNow: async () => {
      const p = get().profile;
      if (!p) return;
      await saveProfile(p);
      persistCloud(p, true);
    },
  };
});

let lifecycleInstalled = false;
function installLifecycleSaves(get: () => ProfileState): void {
  if (lifecycleInstalled || typeof window === 'undefined') return;
  lifecycleInstalled = true;
  const flush = () => {
    get().touch();
    const p = get().profile;
    if (!p) return;
    saveBackupSync(p);
    void saveProfile(p);
    persistCloud(p, true);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
    else get().checkOffline();
  });
  window.addEventListener('pagehide', flush);
  // Отметка «игрок здесь» и периодическое автосохранение.
  setInterval(() => {
    if (document.hidden) return;
    get().touch();
    const p = get().profile;
    if (p) void saveProfile(p);
  }, 10_000);
}
