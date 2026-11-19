import { gameConfig } from '../game/config/gameConfig';
import type { MapDef } from '../game/config/mapsConfig';
import type { GameEngine } from '../game/engine/GameEngine';
import { rarityColor } from '../ui/theme';
import { getSprite, clearSpriteCache } from './sprites';

/** Отрисовка игрового мира на Canvas. Только читает состояние движка. */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** Пикселей CSS на игровую единицу. */
  scale = 1;
  private time = 0;
  showDamageNumbers = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private map: MapDef,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  /** Подгоняет канвас под размер контейнера. Возвращает половину области в игровых ед. */
  resize(cssW: number, cssH: number): { hw: number; hh: number } {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = cssW;
    this.h = cssH;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    // Радиус бункера должен помещаться на экране с запасом.
    this.scale = Math.min(cssW / gameConfig.viewWidth, cssH / (gameConfig.viewWidth * 1.15));
    clearSpriteCache();
    this.bg = this.buildBackground();
    return { hw: cssW / 2 / this.scale, hh: cssH / 2 / this.scale };
  }

  private buildBackground(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = Math.round(this.w * this.dpr);
    cv.height = Math.round(this.h * this.dpr);
    const c = cv.getContext('2d')!;
    c.scale(this.dpr, this.dpr);
    const p = this.map.palette;
    const g = c.createRadialGradient(this.w / 2, this.h / 2, 0, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.7);
    g.addColorStop(0, p.groundAlt);
    g.addColorStop(1, '#0b0c0e');
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);

    // Детерминированный «шум» для одинаковых декораций.
    let seed = 1337 + this.map.id * 101;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const cx = this.w / 2;
    const cy = this.h / 2;
    const s = this.scale;

    // Разбитые дороги
    c.strokeStyle = 'rgba(255,255,255,0.035)';
    c.lineWidth = 26 * s;
    c.beginPath();
    c.moveTo(0, cy + 90 * s);
    c.lineTo(this.w, cy + 60 * s);
    c.moveTo(cx - 120 * s, 0);
    c.lineTo(cx - 90 * s, this.h);
    c.stroke();

    // Руины зданий по краям
    for (let i = 0; i < 26; i++) {
      const x = rnd() * this.w;
      const y = rnd() * this.h;
      if (Math.hypot(x - cx, y - cy) < 175 * s) continue;
      const bw = (20 + rnd() * 50) * s;
      const bh = (20 + rnd() * 50) * s;
      c.save();
      c.translate(x, y);
      c.rotate((rnd() - 0.5) * 0.4);
      c.fillStyle = p.debris;
      c.globalAlpha = 0.55 + rnd() * 0.3;
      c.fillRect(-bw / 2, -bh / 2, bw, bh);
      c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.lineWidth = 2;
      c.strokeRect(-bw / 2, -bh / 2, bw, bh);
      // Выбитый угол
      c.fillStyle = p.groundAlt;
      c.beginPath();
      c.moveTo(bw / 2, -bh / 2);
      c.lineTo(bw / 2 - bw * 0.35 * rnd(), -bh / 2);
      c.lineTo(bw / 2, -bh / 2 + bh * 0.4 * rnd());
      c.fill();
      c.restore();
    }
    // Пятна ржавчины и мусор
    c.globalAlpha = 1;
    for (let i = 0; i < 70; i++) {
      const x = rnd() * this.w;
      const y = rnd() * this.h;
      const r = (2 + rnd() * 7) * s;
      c.fillStyle = rnd() < 0.3 ? p.accent : 'rgba(0,0,0,0.35)';
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    // Трещины
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      let x = rnd() * this.w;
      let y = rnd() * this.h;
      c.beginPath();
      c.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (rnd() - 0.5) * 40 * s;
        y += (rnd() - 0.5) * 40 * s;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    // Виньетка
    const v = c.createRadialGradient(cx, cy, Math.min(this.w, this.h) * 0.35, cx, cy, Math.max(this.w, this.h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.65)');
    c.fillStyle = v;
    c.fillRect(0, 0, this.w, this.h);
    return cv;
  }

  render(engine: GameEngine, frameDt: number): void {
    this.time += frameDt;
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (this.bg) c.drawImage(this.bg, 0, 0);
    else {
      c.fillStyle = '#111';
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    const s = this.scale * this.dpr;
    c.setTransform(s, 0, 0, s, (this.w / 2) * this.dpr, (this.h / 2) * this.dpr);

    this.drawRadius(engine);
    this.drawBlasts(engine);
    this.drawEnemies(engine);
    this.drawBunker(engine);
    this.drawRings(engine);
    this.drawBeams(engine);
    this.drawParticles(engine);
    this.drawLoot(engine);
    if (this.showDamageNumbers) this.drawNumbers(engine);
  }

  private drawRadius(e: GameEngine): void {
    const c = this.ctx;
    const r = e.stats.radius;
    const supp = e.bunker.suppressT > 0;
    const g = c.createRadialGradient(0, 0, gameConfig.bunkerBodyRadius, 0, 0, r);
    g.addColorStop(0, supp ? 'rgba(176,77,255,0.10)' : 'rgba(63,200,255,0.10)');
    g.addColorStop(1, supp ? 'rgba(176,77,255,0.02)' : 'rgba(63,200,255,0.02)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = supp ? 'rgba(176,77,255,0.5)' : 'rgba(63,200,255,0.35)';
    c.lineWidth = 1.2;
    c.setLineDash([6, 6]);
    c.lineDashOffset = -this.time * 12;
    c.stroke();
    c.setLineDash([]);
  }

  private drawBunker(e: GameEngine): void {
    const c = this.ctx;
    const R = gameConfig.bunkerBodyRadius;
    // Бетонное основание
    c.fillStyle = '#3b3f44';
    c.strokeStyle = '#121315';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      c.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    c.closePath();
    c.fill();
    c.stroke();
    // Ржавые полосы
    c.strokeStyle = '#7a3d1c';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, R * 0.78, 0.3, 1.2);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, R * 0.78, 3.4, 4.1);
    c.stroke();
    // Излучатели
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + this.time * 0.4;
      c.fillStyle = '#5a6066';
      c.beginPath();
      c.arc(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, 4, 0, Math.PI * 2);
      c.fill();
    }
    // Энергоядро: светится сильнее перед импульсом.
    const interval = 1 / Math.max(0.05, e.stats.pulseRate * e.bunker.suppressFactor);
    const charge = Math.min(1, e.bunker.pulseTimer / interval);
    const core = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
    const supp = e.bunker.suppressT > 0;
    core.addColorStop(0, '#e8fbff');
    core.addColorStop(0.35, supp ? '#b04dff' : '#3fc8ff');
    core.addColorStop(1, 'rgba(20,80,120,0)');
    c.globalAlpha = 0.45 + charge * 0.55;
    c.fillStyle = core;
    c.beginPath();
    c.arc(0, 0, R * 0.5, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    if (e.bunker.hitFlash > 0) {
      c.fillStyle = `rgba(255,60,40,${e.bunker.hitFlash * 2.5})`;
      c.beginPath();
      c.arc(0, 0, R, 0, Math.PI * 2);
      c.fill();
    }
  }

  private drawRings(e: GameEngine): void {
    const c = this.ctx;
    const R0 = gameConfig.bunkerBodyRadius;
    for (const r of e.visuals.rings) {
      const k = r.t / r.maxT;
      const rad = R0 + (r.radius - R0) * Math.min(1, k * 1.4);
      c.strokeStyle = r.crit ? `rgba(255,215,90,${1 - k})` : `rgba(120,220,255,${(1 - k) * (r.weak ? 0.6 : 1)})`;
      c.lineWidth = (r.crit ? 5 : 3) * (1 - k * 0.6);
      c.beginPath();
      c.arc(0, 0, rad, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = `rgba(63,200,255,${(1 - k) * 0.25})`;
      c.lineWidth = 10 * (1 - k);
      c.stroke();
    }
  }

  private drawEnemies(e: GameEngine): void {
    const c = this.ctx;
    const pxScale = this.scale * this.dpr;
    for (const en of e.enemies) {
      if (!en.alive) continue;
      const spr = getSprite(en.kind, en.size, en.elite, pxScale);
      const ang = Math.atan2(-en.y, -en.x);
      const w = (spr.width / pxScale);
      // Покачивание при ходьбе
      const bob = en.attacking ? 0 : Math.sin(en.anim * 12) * 0.08;
      c.save();
      c.translate(en.x, en.y);
      c.rotate(ang + bob);
      c.drawImage(spr, -w / 2, -w / 2, w, w);
      if (en.hitFlash > 0) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = en.hitFlash * 4;
        c.drawImage(spr, -w / 2, -w / 2, w, w);
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
      }
      c.restore();

      const st = en.status;
      if (st.freezeT > 0 || st.slowT > 0) {
        c.strokeStyle = st.freezeT > 0 ? 'rgba(200,240,255,0.9)' : 'rgba(120,200,255,0.6)';
        c.lineWidth = st.freezeT > 0 ? 3 : 1.5;
        c.beginPath();
        c.arc(en.x, en.y, en.size + 3, 0, Math.PI * 2);
        c.stroke();
      }
      if (st.burnT > 0) {
        c.fillStyle = `rgba(255,${120 + Math.random() * 60},40,0.55)`;
        c.beginPath();
        c.arc(en.x + (Math.random() - 0.5) * en.size, en.y - en.size * 0.3, en.size * 0.35, 0, Math.PI * 2);
        c.fill();
      }
      if (st.stunT > 0) {
        c.fillStyle = '#ffe066';
        for (let i = 0; i < 3; i++) {
          const a = this.time * 6 + (i * Math.PI * 2) / 3;
          c.fillRect(en.x + Math.cos(a) * en.size - 1.5, en.y - en.size - 6 + Math.sin(a) * 3, 3, 3);
        }
      }
      if (st.shockT > 0 && Math.random() < 0.3) {
        c.strokeStyle = '#9fe8ff';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(en.x - en.size, en.y);
        c.lineTo(en.x, en.y - en.size * 0.5);
        c.lineTo(en.x + en.size, en.y + 2);
        c.stroke();
      }
      if (st.corrosionT > 0 || st.armorBreakT > 0) {
        c.fillStyle = 'rgba(166,255,77,0.5)';
        c.fillRect(en.x - en.size * 0.6, en.y + en.size * 0.6, en.size * 1.2, 2);
      }
      if (en.auraArmor > 0) {
        c.strokeStyle = 'rgba(47,212,122,0.35)';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(en.x, en.y, en.size + 5, 0, Math.PI * 2);
        c.stroke();
      }
      if (en.shield > 0) {
        c.strokeStyle = `rgba(110,190,255,${0.3 + 0.5 * (en.shield / en.maxShield)})`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(en.x, en.y, en.size + 4, 0, Math.PI * 2);
        c.stroke();
      }
      // Полоса HP (боссу — в интерфейсе)
      if (!en.isBoss && (en.hp < en.maxHp || en.elite || en.isMiniboss)) {
        const bw = Math.max(16, en.size * 2);
        const y = en.y - en.size - 7;
        c.fillStyle = 'rgba(0,0,0,0.7)';
        c.fillRect(en.x - bw / 2, y, bw, 3);
        c.fillStyle = en.elite || en.isMiniboss ? '#ffb02e' : '#e5483a';
        c.fillRect(en.x - bw / 2, y, (bw * en.hp) / en.maxHp, 3);
        if (en.maxShield > 0 && en.shield > 0) {
          c.fillStyle = '#6ebeff';
          c.fillRect(en.x - bw / 2, y - 2, (bw * en.shield) / en.maxShield, 1.5);
        }
      }
    }
  }

  private drawBeams(e: GameEngine): void {
    const c = this.ctx;
    for (const b of e.visuals.beams) {
      const k = 1 - b.t / b.maxT;
      c.strokeStyle = b.color;
      c.globalAlpha = k;
      c.lineWidth = b.width;
      c.beginPath();
      c.moveTo(b.x1, b.y1);
      if (b.jagged) {
        const n = 6;
        for (let i = 1; i < n; i++) {
          const t = i / n;
          c.lineTo(b.x1 + (b.x2 - b.x1) * t + (Math.random() - 0.5) * 12, b.y1 + (b.y2 - b.y1) * t + (Math.random() - 0.5) * 12);
        }
      }
      c.lineTo(b.x2, b.y2);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  private drawBlasts(e: GameEngine): void {
    const c = this.ctx;
    for (const b of e.visuals.blasts) {
      const k = b.t / b.maxT;
      c.strokeStyle = b.color;
      c.globalAlpha = 1 - k;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(b.x, b.y, b.r * (0.3 + k * 0.7), 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = (1 - k) * 0.25;
      c.fillStyle = b.color;
      c.fill();
    }
    c.globalAlpha = 1;
  }

  private drawParticles(e: GameEngine): void {
    const c = this.ctx;
    for (const p of e.visuals.particles) {
      c.globalAlpha = 1 - p.t / p.maxT;
      c.fillStyle = p.color;
      c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    c.globalAlpha = 1;
  }

  private drawLoot(e: GameEngine): void {
    const c = this.ctx;
    for (const l of e.visuals.loot) {
      const k = l.t / l.maxT;
      const ease = k * k;
      const x = l.x * (1 - ease);
      const y = l.y * (1 - ease) - Math.sin(k * Math.PI) * 30;
      const col = rarityColor[l.rarity];
      c.save();
      c.translate(x, y);
      c.rotate(this.time * 4);
      c.shadowColor = col;
      c.shadowBlur = 12;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, -7);
      c.lineTo(5, 0);
      c.lineTo(0, 7);
      c.lineTo(-5, 0);
      c.closePath();
      c.fill();
      c.restore();
    }
  }

  private drawNumbers(e: GameEngine): void {
    const c = this.ctx;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const n of e.visuals.numbers) {
      const k = n.t / 0.8;
      c.globalAlpha = 1 - k * k;
      c.font = `${n.crit ? 'bold 15px' : '600 11px'} system-ui, sans-serif`;
      c.fillStyle = '#000';
      c.fillText(String(n.value), n.x + 1, n.y - k * 22 + 1);
      c.fillStyle = n.color;
      c.fillText(String(n.value), n.x, n.y - k * 22);
    }
    c.globalAlpha = 1;
  }
}
