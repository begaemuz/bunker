import { computeBunkerStats } from './bunker/BunkerStats';
import { bossesConfig } from './config/bossesConfig';
import { getLocation } from './config/locationsConfig';
import { rollBossLoot } from './economy/DropSystem';
import { GameEngine, type GameEvent } from './engine/GameEngine';
import { GameLoop } from './engine/GameLoop';
import { isAtLeast } from './items/ItemRarity';
import { canSummonBoss } from './profile/Profile';
import { ratesFromRun } from './progression/offline';
import { rewardDecay } from './progression/rewards';
import { Renderer } from '../render/Renderer';
import { useProfile } from '../stores/profileStore';
import { useUi } from '../stores/uiStore';
import { ru } from '../i18n/ru';
import { sfx } from '../services/sound';
import { haptic } from '../services/telegram';

/**
 * Связка движка, цикла, отрисовки и хранилищ. Одна сессия — один заход
 * на локацию. Бой продолжается, пока игрок открывает другие разделы.
 */
export class GameSession {
  readonly engine: GameEngine;
  private loop: GameLoop;
  private renderer: Renderer;
  private hudTimer = 0;
  private ratesTimer = 30;
  private unsubs: (() => void)[] = [];
  private committed = { time: 0, damageDealt: 0, damageTaken: 0 };
  private finished = false;
  private profileCreatedAt: number;
  private summonedWithPass = false;

  constructor(canvas: HTMLCanvasElement) {
    const profile = useProfile.getState().profile!;
    this.profileCreatedAt = profile.createdAt;
    const location = getLocation(profile.locations.current);
    this.engine = new GameEngine(
      location,
      () => computeBunkerStats(useProfile.getState().profile!),
      () => ({ decay: rewardDecay(useProfile.getState().profile!.bunker.level, location) }),
    );
    this.renderer = new Renderer(canvas, location);
    this.renderer.showDamageNumbers = useUi.getState().settings.showDamageNumbers;

    this.loop = new GameLoop(
      (dt) => this.engine.update(dt),
      (fdt) => {
        // Пока открыт другой раздел, поле не видно — не тратим силы на отрисовку.
        if (useUi.getState().screen === 'game') this.renderer.render(this.engine, fdt);
        this.hudTimer -= fdt;
        if (this.hudTimer <= 0) {
          this.hudTimer = 0.1;
          this.publishHud();
        }
        this.ratesTimer -= fdt;
        if (this.ratesTimer <= 0) {
          this.ratesTimer = 20;
          this.updateRates();
        }
      },
    );

    this.unsubs.push(this.engine.on((e) => this.onEvent(e)));
    this.unsubs.push(
      useProfile.subscribe((s, prev) => {
        if (s.statsVersion !== prev.statsVersion) this.engine.refreshStats();
        if (s.offlineReward !== prev.offlineReward) this.syncPause();
      }),
    );
    this.unsubs.push(
      useUi.subscribe((s, prev) => {
        if (s.settings !== prev.settings) {
          this.loop.speed = s.settings.speed;
          this.renderer.showDamageNumbers = s.settings.showDamageNumbers;
        }
        if (s.paused !== prev.paused || s.bossReward !== prev.bossReward || s.introOpen !== prev.introOpen) this.syncPause();
      }),
    );
    this.loop.speed = useUi.getState().settings.speed;
    this.syncPause();
    useProfile.getState().addStats({ runs: 1 });
  }

  /** Пауза только вручную или пока открыто окно награды / вступление. */
  private syncPause(): void {
    const ui = useUi.getState();
    this.loop.paused = ui.paused || ui.bossReward !== null || ui.introOpen || useProfile.getState().offlineReward !== null;
  }

  resize(w: number, h: number): void {
    const v = this.renderer.resize(w, h);
    this.engine.setViewport(v.hw, v.hh);
    this.renderer.render(this.engine, 0);
  }

  start(): void {
    this.loop.start();
  }

  destroy(): void {
    this.commitStats();
    this.updateRates();
    this.loop.stop();
    for (const u of this.unsubs) u();
  }

  surrender(): void {
    this.engine.surrender();
  }

  /** Темпы добычи для офлайн-прогресса (без учёта боссов). */
  private updateRates(): void {
    const r = this.engine.run;
    if (r.bossesKilled > 0 || this.engine.mode === 'boss') return;
    const rates = ratesFromRun(r, this.engine.location.id);
    if (rates) useProfile.getState().setRates(rates);
  }

  summonBoss(usePass: boolean): boolean {
    const loc = this.engine.location;
    const prof = useProfile.getState();
    if (this.engine.mode === 'boss' || this.engine.state !== 'running') return false;
    if (!usePass && !canSummonBoss(prof.profile!, loc.id)) return false;
    if (!prof.summon(loc.id, usePass)) return false;
    this.summonedWithPass = usePass;
    return this.engine.summonBoss();
  }

  private onEvent(e: GameEvent): void {
    const ui = useUi.getState();
    const prof = useProfile.getState();
    const loc = this.engine.location;
    switch (e.type) {
      case 'kill': {
        const r = prof.applyLoot(e.loot, e.xp);
        if (r.levels > 0) {
          ui.toast(`Уровень бункера ${useProfile.getState().profile!.bunker.level}`, 'good');
          sfx.levelUp();
          haptic('success');
        }
        const sold = new Set(r.sold.map((x) => x.id));
        for (const it of e.loot.items) {
          if (sold.has(it.id)) continue;
          const rare = isAtLeast(it.rarity, 'rare');
          ui.toast(`${ru.rarity[it.rarity]}: ${it.name}`, rare ? 'rare' : 'info');
          sfx.item(rare);
          if (rare) haptic('medium');
        }
        for (const p of e.loot.parts) ui.toast(`Модификация: ${p.name}`, 'rare');
        if (e.loot.resources.expansionKeys) ui.toast('Найден ключ расширения слота', 'rare');
        if (e.loot.resources.bossPasses) ui.toast('Найден пропуск вызова босса', 'rare');
        if (e.enemy.isMiniboss) prof.addStats({ minibossesKilled: 1 });
        sfx.kill(e.enemy.isMiniboss);
        break;
      }
      case 'groupCleared': {
        const before = canSummonBoss(prof.profile!, loc.id);
        prof.addGroup(loc.id);
        if (!before && canSummonBoss(useProfile.getState().profile!, loc.id)) {
          ui.toast('Можно вызвать босса', 'good');
          haptic('success');
        }
        break;
      }
      case 'pulse':
        if (useUi.getState().screen === 'game') sfx.pulse(e.crit);
        break;
      case 'bunkerHit':
        sfx.hit();
        break;
      case 'overheat':
        ui.toast('Перегрев: катушки остывают', 'bad');
        break;
      case 'emergencyRepair':
        ui.toast('Аварийный ремонт', 'good');
        break;
      case 'bossSpawn':
        sfx.boss();
        haptic('heavy');
        ui.toast(`${e.name} вступает в бой`, 'bad');
        break;
      case 'minibossSpawn':
        ui.toast(`${e.name} на подходе`, 'bad');
        break;
      case 'bossKilled': {
        const s = this.engine.stats;
        const loot = rollBossLoot(e.bossId, { location: loc, decay: 1, dropChanceMult: s.dropChanceMult, coinMult: s.coinMult });
        const boss = bossesConfig[e.bossId];
        const r = prof.applyLoot({ resources: {}, items: [], parts: [] }, boss.xp * s.xpMult);
        if (r.levels > 0) sfx.levelUp();
        const unlocked = useProfile.getState().bossVictory(loc.id, loot);
        this.engine.addLoot(loot);
        sfx.victory();
        haptic('success');
        this.commitStats();
        useUi.getState().setBossReward({ locationId: loc.id, bossName: boss.name, loot, unlocked });
        break;
      }
      case 'defeat':
        haptic('error');
        this.finish(e.duringBoss);
        break;
    }
  }

  private commitStats(): void {
    if (useProfile.getState().profile?.createdAt !== this.profileCreatedAt) return;
    const r = this.engine.run;
    const c = this.committed;
    const delta = {
      playTime: r.time - c.time,
      damageDealt: r.damageDealt - c.damageDealt,
      damageTaken: r.damageTaken - c.damageTaken,
    };
    if (delta.playTime <= 0) return;
    this.committed = { time: r.time, damageDealt: r.damageDealt, damageTaken: r.damageTaken };
    useProfile.getState().addStats(delta);
  }

  private finish(duringBoss: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.commitStats();
    this.updateRates();
    const prof = useProfile.getState();
    prof.addStats({ defeats: 1 });
    if (duringBoss) prof.refundSummon(this.engine.location.id, this.summonedWithPass);
    sfx.defeat();
    void prof.saveNow();
    this.publishHud();
    setTimeout(() => {
      useUi.getState().setResult({ locationId: this.engine.location.id, duringBoss, run: this.engine.run });
    }, 900);
  }

  private publishHud(): void {
    const e = this.engine;
    const boss = e.boss;
    useUi.getState().setHud({
      hp: e.bunker.hp,
      maxHp: e.stats.maxHp,
      energy: e.bunker.energy,
      capacity: e.stats.capacity,
      heat: e.bunker.heat,
      heatCap: e.stats.heatCap,
      overheated: e.bunker.overheated,
      coils: [0, 1].map((i) => {
        const c = e.coilAt(i);
        if (!c) return null;
        const rt = e.bunker.coils[i];
        return { name: c.name, mode: c.mode, charge: Math.min(1, rt.timer / c.interval), blocked: rt.blocked };
      }),
      dps: e.currentDps,
      kills: e.run.kills,
      alive: e.aliveCount,
      runCoins: e.run.resources.coins,
      threat: e.threat,
      mode: e.mode,
      boss: boss ? { name: boss.def.name, hp: boss.hp, maxHp: boss.maxHp, shield: boss.shield, maxShield: boss.maxShield } : null,
      suppressed: e.bunker.suppressT > 0,
      recentDrops: [...e.recentDrops],
      state: e.state,
    });
  }
}
