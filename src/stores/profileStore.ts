import { create } from 'zustand';
import { applyAutoSell } from '../game/economy/AutoSell';
import type { Loot } from '../game/economy/DropSystem';
import { tryUpgrade, type UpgradeOutcome } from '../game/items/ItemUpgrade';
import { addParts, extractPart, fuseAll, fuseParts, installPart, unlockSlot, type InstallError } from '../game/items/Parts';
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
import type { QuestPeriod } from '../game/config/metaConfig';
import { claimVipChest, claimVipGift } from '../game/meta/vipActions';
import { computeOfflineReward, type OfflineReward } from '../game/progression/offline';
import { research , resetSkills } from '../game/progression/TechnologyTree';
import type { Item, Part, Rarity, Resources, SlotId } from '../game/types';
import {
  buyOffer,
  buySpecial,
  claimDaily,
  claimQuest,
  claimQuestBonus,
  doExchange,
  ensureQuests,
  ensureShop,
  questProgress,
  refreshShop,
} from '../game/meta/Meta';
import { sellMany } from '../game/profile/Profile';
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
  applyLoot: (loot: Loot, xp: number, enemyKind?: string) => { levels: number; sold: Item[]; coins: number };
  massSell: (ids: string[]) => { coins: number; count: number };
  ensureMeta: () => void;
  buy: (section: 'regular' | 'rare', offerId: string) => string | null;
  buySpecial: (id: string) => { got?: string; error?: string };
  refreshShop: () => boolean;
  exchange: (id: string) => string | null;
  claimDaily: () => Partial<Resources> | null;
  claimQuest: (id: string) => boolean;
  claimQuestBonus: (period: QuestPeriod) => boolean;
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
  resetSkills: () => void;
  setLocation: (id: number) => void;
  setAutoSell: (r: Rarity | null) => void;
  installPart: (partId: string, itemId: string, slot: number) => InstallError | null;
  unlockSlot: (itemId: string, slot: number) => boolean;
  fuse: (partId: string) => { success?: boolean; result?: Part; error?: string };
  scrapPart: (partId: string) => number;
  extractPart: (itemId: string, slot: number) => string | null;
  setPlayer: (patch: Partial<Profile['player']>) => void;
  claimVipChest: () => boolean;
  claimVipGift: (level: number) => boolean;
  fuseAll: (rarity: Rarity) => { success: number; failed: number; results: Part[] };
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
      const safe = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
      await safe(initTelegram(), 5000, null);
      const user = tgUser();
      setStorageUser(user?.id ?? null);
      let profile = await safe(loadProfile(), 6000, null);
      // Облачная копия Telegram: берём более свежую.
      if (cloudAvailable()) {
        const raw = await safe(cloudLoad(), 6000, null);
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
      try {
        p = ensureQuests(ensureShop(p));
      } catch (e) {
        console.error('Магазин/задания', e);
      }
      let offlineReward: OfflineReward | null = null;
      try {
        offlineReward = computeOfflineReward(p);
      } catch (e) {
        console.error('Офлайн-награда', e);
      }
      set({ profile: p, loaded: true, tg: user, cloud: cloudAvailable(), offlineReward });
      void saveProfile(p);
      persistCloud(p, true);
      installLifecycleSaves(get);
    },

    applyLoot: (loot, xp, enemyKind) => {
      let p = get().profile;
      if (!p) return { levels: 0, sold: [], coins: 0 };
      p = addResources(p, loot.resources);
      if (enemyKind) {
        p = questProgress(p, 'kill');
        if (enemyKind === 'heavy' || enemyKind === 'armored') p = questProgress(p, 'killHeavy');
        if (enemyKind === 'miniboss') p = questProgress(p, 'miniboss');
        p = questProgress(p, 'coins', loot.resources.coins ?? 0);
        p = questProgress(p, 'items', loot.items.length);
      }
      const r = withItems(p, loot.items);
      p = addParts(r.profile, loot.parts);
      const lv = addXp(p, xp);
      p = { ...lv.profile, stats: { ...lv.profile.stats, robotsKilled: lv.profile.stats.robotsKilled + 1 } };
      commit(p, lv.levelsGained > 0, loot.items.length + loot.parts.length > 0);
      return { levels: lv.levelsGained, sold: r.sold, coins: r.coins };
    },

    addGroup: (locationId) => {
      const p = get().profile;
      if (p) commit(questProgress(addGroupKill(p, locationId), 'groups'));
    },

    massSell: (ids) => {
      const p = get().profile;
      if (!p) return { coins: 0, count: 0 };
      const r = sellMany(p, ids);
      commit(r.profile, false, true);
      return { coins: r.coins, count: r.count };
    },

    ensureMeta: () => {
      const p = get().profile;
      if (!p) return;
      const q = ensureQuests(ensureShop(p));
      if (q !== p) commit(q, false, true);
    },

    buy: (section, offerId) => {
      const p = get().profile;
      if (!p) return 'not_loaded';
      const r = buyOffer(p, section, offerId);
      if (r.error) return r.error;
      commit(questProgress(r.profile, 'items', 0), false, true);
      return null;
    },

    buySpecial: (id) => {
      const p = get().profile;
      if (!p) return { error: 'not_loaded' };
      const r = buySpecial(p, id);
      if (r.error) return { error: r.error };
      commit(r.profile, false, true);
      return { got: r.got };
    },

    refreshShop: () => {
      const p = get().profile;
      const q = p ? refreshShop(p) : null;
      if (!q) return false;
      commit(q, false, true);
      return true;
    },

    exchange: (id) => {
      const p = get().profile;
      if (!p) return 'not_loaded';
      const r = doExchange(p, id);
      if (r.error) return r.error;
      commit(r.profile, false, true);
      return null;
    },

    claimDaily: () => {
      const p = get().profile;
      if (!p) return null;
      const r = claimDaily(p);
      if (!r.reward) return null;
      commit(r.profile, false, true);
      return r.reward;
    },

    claimQuest: (id) => {
      const p = get().profile;
      const q = p ? claimQuest(p, id) : null;
      if (!q) return false;
      commit(q, false, true);
      return true;
    },

    claimQuestBonus: (period) => {
      const p = get().profile;
      const q = p ? claimQuestBonus(p, period) : null;
      if (!q) return false;
      commit(q, false, true);
      return true;
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
      p = questProgress(p, 'boss');
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
      const kit = ensureMinimumKit(questProgress(r.profile, 'upgrade'));
      commit(kit.profile, true, true);
      return { outcome: r.outcome, granted: kit.granted };
    },

    resetSkills: () => {
      const p = get().profile;
      if (p) commit(resetSkills(p), true, true);
    },

    research: (techId) => {
      const p = get().profile;
      if (!p) return 'not_loaded';
      const r = research(p, techId);
      if (r.error) return r.error;
      commit(questProgress(r.profile, 'research'), true, true);
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

    claimVipChest: () => {
      const p = get().profile;
      const q = p ? claimVipChest(p) : null;
      if (!q) return false;
      commit(q, true, true);
      return true;
    },

    claimVipGift: (level) => {
      const p = get().profile;
      const r = p ? claimVipGift(p, level) : null;
      if (!r) return false;
      commit(r.profile, true, true);
      return true;
    },

    setPlayer: (patch) => {
      const p = get().profile;
      if (!p) return;
      commit({ ...p, player: { ...p.player, ...patch } }, true, true);
    },

    extractPart: (itemId, slot) => {
      const p = get().profile;
      if (!p) return 'not_loaded';
      const r = extractPart(p, itemId, slot);
      if (r.error) return r.error;
      commit(r.profile, true, true);
      return null;
    },

    fuseAll: (rarity) => {
      const p = get().profile;
      if (!p) return { success: 0, failed: 0, results: [] };
      const r = fuseAll(p, rarity);
      commit(r.profile, false, true);
      return { success: r.success, failed: r.failed, results: r.results };
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
