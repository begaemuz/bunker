import { computeBunkerStats } from './bunker/BunkerStats';
import { getMap } from './config/mapsConfig';
import { GameEngine, type GameEvent } from './engine/GameEngine';
import { GameLoop } from './engine/GameLoop';
import { Renderer } from '../render/Renderer';
import { useProfile } from '../stores/profileStore';
import { useUi } from '../stores/uiStore';
import { ru } from '../i18n/ru';
import { isAtLeast } from './items/ItemRarity';
import { sfx } from '../services/sound';

/**
 * Связка движка, цикла, отрисовки и хранилищ. Одна сессия — один бой.
 * React только создаёт/уничтожает её и читает снимок HUD.
 */
export class GameSession {
  readonly engine: GameEngine;
  private loop: GameLoop;
  private renderer: Renderer;
  private hudTimer = 0;
  private unsubs: (() => void)[] = [];
  /** Сколько статистики уже записано в профиль (чтобы записывать приращения). */
  private committed = { time: 0, damageDealt: 0, damageTaken: 0, waves: 0 };
  private finished = false;
  /** Профиль, к которому относится бой (после сброса прогресса статистика не переносится). */
  private profileCreatedAt: number;

  constructor(canvas: HTMLCanvasElement) {
    const profile = useProfile.getState().profile!;
    this.profileCreatedAt = profile.createdAt;
    const map = getMap(profile.maps.selected);
    this.engine = new GameEngine(map, (eff) => computeBunkerStats(useProfile.getState().profile!, eff));
    this.renderer = new Renderer(canvas, map);
    this.renderer.showDamageNumbers = useUi.getState().settings.showDamageNumbers;

    this.loop = new GameLoop(
      (dt) => this.engine.update(dt),
      (fdt) => {
        this.renderer.render(this.engine, fdt);
        this.hudTimer -= fdt;
        if (this.hudTimer <= 0) {
          this.hudTimer = 0.1;
          this.publishHud();
        }
      },
    );

    this.unsubs.push(this.engine.on((e) => this.onEvent(e)));
    // Смена экипировки или уровня — пересчёт характеристик прямо в бою.
    this.unsubs.push(
      useProfile.subscribe((s, prev) => {
        if (s.statsVersion !== prev.statsVersion) this.engine.refreshStats();
      }),
    );
    this.unsubs.push(
      useUi.subscribe((s, prev) => {
        if (s.settings !== prev.settings) {
          this.loop.speed = s.settings.speed;
          this.renderer.showDamageNumbers = s.settings.showDamageNumbers;
        }
        if (s.paused !== prev.paused || s.screen !== prev.screen || s.menuOpen !== prev.menuOpen) this.syncPause();
      }),
    );
    this.loop.speed = useUi.getState().settings.speed;
    this.syncPause();
    useProfile.getState().addStats({ runs: 1 });
  }

  /** Бой ставится на паузу вручную или пока открыт другой раздел. */
  private syncPause(): void {
    const ui = useUi.getState();
    this.loop.paused = ui.paused || ui.menuOpen || ui.screen !== 'game';
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
    this.loop.stop();
    for (const u of this.unsubs) u();
  }

  surrender(): void {
    this.engine.surrender();
  }

  private onEvent(e: GameEvent): void {
    const ui = useUi.getState();
    const prof = useProfile.getState();
    switch (e.type) {
      case 'kill': {
        const gained = prof.applyLoot(e.loot, e.xp);
        if (gained > 0) {
          ui.toast(`Уровень бункера ${useProfile.getState().profile!.bunker.level}!`, 'good');
          sfx.levelUp();
        }
        for (const it of e.loot.items) {
          const rare = isAtLeast(it.rarity, 'rare');
          ui.toast(`${ru.rarity[it.rarity]}: ${it.name}`, rare ? 'rare' : 'info');
          sfx.item(rare);
        }
        if (e.enemy.isMiniboss) prof.addStats({ minibossesKilled: 1 });
        sfx.kill(e.enemy.isBoss || e.enemy.isMiniboss);
        break;
      }
      case 'pulse':
        sfx.pulse(e.crit);
        break;
      case 'bunkerHit':
        sfx.hit();
        break;
      case 'waveStart':
        if (e.isBoss) ui.toast('Приближается босс!', 'bad');
        break;
      case 'bossSpawn':
        sfx.boss();
        break;
      case 'minibossSpawn':
        ui.toast(`${e.name} на подходе`, 'bad');
        break;
      case 'waveCleared':
        this.commitStats();
        prof.setMapProgress(this.engine.map.id, e.wave, false);
        break;
      case 'victory':
      case 'defeat':
        this.finish(e.type);
        break;
    }
  }

  /** Записывает приращение статистики боя в профиль. */
  private commitStats(): void {
    if (useProfile.getState().profile?.createdAt !== this.profileCreatedAt) return;
    const r = this.engine.run;
    const c = this.committed;
    const delta = {
      playTime: r.time - c.time,
      damageDealt: r.damageDealt - c.damageDealt,
      damageTaken: r.damageTaken - c.damageTaken,
      wavesCompleted: r.wavesCleared - c.waves,
    };
    if (delta.playTime <= 0 && delta.wavesCompleted <= 0) return;
    this.committed = { time: r.time, damageDealt: r.damageDealt, damageTaken: r.damageTaken, waves: r.wavesCleared };
    useProfile.getState().addStats(delta);
  }

  private finish(outcome: 'victory' | 'defeat'): void {
    if (this.finished) return;
    this.finished = true;
    this.commitStats();
    const prof = useProfile.getState();
    const map = this.engine.map;
    if (outcome === 'victory') {
      prof.addStats({ bossesKilled: 1, mapsCompleted: 1 });
      prof.setMapProgress(map.id, this.engine.wave, true);
      sfx.victory();
    } else {
      prof.addStats({ defeats: 1 });
      prof.setMapProgress(map.id, Math.max(0, this.engine.wave - 1), false);
      sfx.defeat();
    }
    void prof.saveNow();
    this.publishHud();
    // Небольшая задержка, чтобы увидеть взрыв.
    setTimeout(() => {
      useUi.getState().setResult({ outcome, mapId: map.id, wave: this.engine.wave, run: this.engine.run });
    }, 900);
  }

  private publishHud(): void {
    const e = this.engine;
    const boss = e.boss;
    useUi.getState().setHud({
      hp: e.bunker.hp,
      maxHp: e.stats.maxHp,
      wave: e.wave,
      bossWave: e.bossWave,
      phase: e.phase,
      breakLeft: e.phase === 'break' ? e.phaseTimer : 0,
      dps: e.currentDps,
      kills: e.run.kills,
      runCoins: e.run.resources.coins,
      battery: e.bunker.battery,
      batteryCap: e.stats.energy.batteryCap,
      energyBalance: e.stats.energy.balance,
      efficiency: e.bunker.efficiency,
      boss: boss
        ? { name: boss.def.name, hp: boss.hp, maxHp: boss.maxHp, shield: boss.shield, maxShield: boss.maxShield }
        : null,
      suppressed: e.bunker.suppressT > 0,
      recentDrops: [...e.recentDrops],
      state: e.state,
      alive: e.aliveCount,
    });
  }
}
