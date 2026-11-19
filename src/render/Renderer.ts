import { gameConfig } from '../game/config/gameConfig';
import type { LocationDef } from '../game/config/locationsConfig';
import { modeConfig } from '../game/config/gameConfig';
import type { GameEngine } from '../game/engine/GameEngine';
import type { Enemy } from '../game/enemies/Enemy';
import { rarityColor } from '../ui/theme';
import { getSprite, clearSpriteCache, SPRITE_FOOT, SPRITE_W } from './sprites';

/**
 * Наклон камеры: земля сжимается по вертикали, роботы и бункер
 * стоят вертикально — вид «два с половиной D».
 */
export const TILT = 0.56;

// Старые WebView без roundRect: рисуем обычный прямоугольник.
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  (CanvasRenderingContext2D.prototype as unknown as { roundRect: (x: number, y: number, w: number, h: number) => void }).roundRect = function (
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    this.rect(x, y, w, h);
  };
}

/** Отрисовка игрового мира на Canvas. Только читает состояние движка. */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** Центр мира (бункер) на экране, CSS px. */
  private cx = 0;
  private cy = 0;
  /** Пикселей CSS на игровую единицу. */
  scale = 1;
  private time = 0;
  showDamageNumbers = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private map: LocationDef,
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
    this.scale = Math.min(cssW / gameConfig.viewWidth, cssH / (gameConfig.viewWidth * 0.95));
    this.cx = cssW / 2;
    this.cy = cssH * 0.56;
    clearSpriteCache();
    this.bg = this.buildBackground();
    const up = this.cy / (this.scale * TILT);
    const down = (cssH - this.cy) / (this.scale * TILT);
    return { hw: cssW / 2 / this.scale, hh: Math.max(up, down) };
  }

  private buildBackground(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = Math.round(this.w * this.dpr);
    cv.height = Math.round(this.h * this.dpr);
    const c = cv.getContext('2d')!;
    c.scale(this.dpr, this.dpr);
    const p = this.map.palette;
    const cx = this.cx;
    const cy = this.cy;
    const s = this.scale;

    // Земля: светлее у бункера, дальний план тонет в дымке.
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, p.fog);
    g.addColorStop(0.18, p.ground);
    g.addColorStop(0.55, p.groundAlt);
    g.addColorStop(1, p.ground);
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);
    const pool = c.createRadialGradient(cx, cy, 0, cx, cy, 220 * s);
    pool.addColorStop(0, 'rgba(255,220,160,0.06)');
    pool.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = pool;
    c.fillRect(0, 0, this.w, this.h);

    let seed = 1337 + this.map.id * 101;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    // Силуэт разрушенного города на горизонте.
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.moveTo(0, this.h * 0.1);
    let x = 0;
    while (x < this.w) {
      const bw = (14 + rnd() * 30) * s;
      const bh = (10 + rnd() * 46) * s;
      c.lineTo(x, this.h * 0.1 - bh);
      c.lineTo(x + bw * (0.6 + rnd() * 0.4), this.h * 0.1 - bh + rnd() * 8 * s);
      c.lineTo(x + bw, this.h * 0.1 - bh * rnd() * 0.5);
      x += bw;
    }
    c.lineTo(this.w, this.h * 0.1);
    c.lineTo(this.w, 0);
    c.lineTo(0, 0);
    c.closePath();
    c.fill();

    // Сетка земли в перспективе: даёт ощущение плоскости.
    c.strokeStyle = 'rgba(255,255,255,0.025)';
    c.lineWidth = 1;
    for (let wy = -600; wy <= 600; wy += 40) {
      const y = cy + wy * s * TILT;
      if (y < 0 || y > this.h) continue;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(this.w, y);
      c.stroke();
    }
    for (let wx = -600; wx <= 600; wx += 40) {
      c.beginPath();
      c.moveTo(cx + wx * s, 0);
      c.lineTo(cx + wx * s, this.h);
      c.stroke();
    }

    // Разбитые дороги
    c.strokeStyle = 'rgba(255,255,255,0.04)';
    c.lineWidth = 26 * s * TILT;
    c.beginPath();
    c.moveTo(0, cy + 90 * s * TILT);
    c.lineTo(this.w, cy + 60 * s * TILT);
    c.stroke();
    c.lineWidth = 26 * s;
    c.beginPath();
    c.moveTo(cx - 140 * s, 0);
    c.lineTo(cx - 90 * s, this.h);
    c.stroke();

    // Пятна ржавчины и мусор
    for (let i = 0; i < 70; i++) {
      const x = rnd() * this.w;
      const y = rnd() * this.h;
      const r = (2 + rnd() * 7) * s;
      c.fillStyle = rnd() < 0.3 ? p.accent : 'rgba(0,0,0,0.35)';
      c.beginPath();
      c.ellipse(x, y, r, r * TILT, 0, 0, Math.PI * 2);
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
        y += (rnd() - 0.5) * 40 * s * TILT;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    this.drawBiome(c, rnd, cx, cy, s);

    // Руины — объёмные коробки, сортируются по глубине.
    const ruins: { x: number; y: number; bw: number; bh: number; d: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const x = rnd() * this.w;
      const y = this.h * 0.08 + rnd() * this.h * 0.95;
      if (Math.hypot(x - cx, (y - cy) / TILT) < 190 * s) continue;
      ruins.push({ x, y, bw: (16 + rnd() * 40) * s, bh: (10 + rnd() * 46) * s, d: (10 + rnd() * 26) * s * TILT });
    }
    ruins.sort((a, b) => a.y - b.y);
    for (const r of ruins) {
      const x0 = r.x - r.bw / 2;
      const yB = r.y;
      const yT = r.y - r.bh;
      // тень
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath();
      c.ellipse(r.x + r.bw * 0.2, yB, r.bw * 0.75, r.d + 4 * s, 0, 0, Math.PI * 2);
      c.fill();
      // верхняя грань
      c.fillStyle = p.accent;
      c.beginPath();
      c.moveTo(x0, yT);
      c.lineTo(x0 + r.d * 0.6, yT - r.d);
      c.lineTo(x0 + r.bw + r.d * 0.6, yT - r.d);
      c.lineTo(x0 + r.bw, yT);
      c.closePath();
      c.fill();
      // боковая грань
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.beginPath();
      c.moveTo(x0 + r.bw, yT);
      c.lineTo(x0 + r.bw + r.d * 0.6, yT - r.d);
      c.lineTo(x0 + r.bw + r.d * 0.6, yB - r.d);
      c.lineTo(x0 + r.bw, yB);
      c.closePath();
      c.fill();
      // фасад с окнами
      const fg = c.createLinearGradient(0, yT, 0, yB);
      fg.addColorStop(0, p.debris);
      fg.addColorStop(1, 'rgba(0,0,0,0.6)');
      c.fillStyle = fg;
      c.fillRect(x0, yT, r.bw, r.bh);
      c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.strokeRect(x0, yT, r.bw, r.bh);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      for (let wy = yT + 5 * s; wy < yB - 6 * s; wy += 9 * s)
        for (let wx = x0 + 4 * s; wx < x0 + r.bw - 6 * s; wx += 8 * s) if (rnd() < 0.7) c.fillRect(wx, wy, 3.5 * s, 4 * s);
      if (rnd() < 0.15) {
        c.fillStyle = 'rgba(255,190,90,0.5)';
        c.fillRect(x0 + 4 * s, yT + 5 * s, 3.5 * s, 4 * s);
      }
    }

    // Виньетка
    const v = c.createRadialGradient(cx, cy, Math.min(this.w, this.h) * 0.35, cx, cy, Math.max(this.w, this.h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = v;
    c.fillRect(0, 0, this.w, this.h);
    return cv;
  }

  /** Особые декорации каждой локации. */
  private drawBiome(c: CanvasRenderingContext2D, rnd: () => number, cx: number, cy: number, s: number): void {
    const far = (x: number, y: number) => Math.hypot(x - cx, (y - cy) / TILT) > 170 * s;
    switch (this.map.id) {
      case 2: // трубы и резервуары
        c.strokeStyle = 'rgba(90,60,30,0.55)';
        c.lineWidth = 7 * s;
        for (let i = 0; i < 5; i++) {
          const y = rnd() * this.h;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(this.w, y + (rnd() - 0.5) * 80 * s);
          c.stroke();
        }
        for (let i = 0; i < 8; i++) {
          const x = rnd() * this.w;
          const y = rnd() * this.h;
          if (!far(x, y)) continue;
          c.fillStyle = 'rgba(70,55,40,0.8)';
          c.beginPath();
          c.ellipse(x, y, (14 + rnd() * 16) * s, (14 + rnd() * 16) * s * TILT, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.5)';
          c.lineWidth = 2;
          c.stroke();
        }
        break;
      case 3: // барханы
        c.strokeStyle = 'rgba(120,95,55,0.35)';
        c.lineWidth = 3 * s;
        for (let i = 0; i < 14; i++) {
          const y = rnd() * this.h;
          c.beginPath();
          c.moveTo(0, y);
          c.bezierCurveTo(this.w * 0.3, y - 30 * s, this.w * 0.6, y + 30 * s, this.w, y);
          c.stroke();
        }
        break;
      case 4: // снег
        for (let i = 0; i < 40; i++) {
          c.fillStyle = `rgba(220,235,245,${0.05 + rnd() * 0.12})`;
          c.beginPath();
          const rr = (6 + rnd() * 24) * s;
          c.ellipse(rnd() * this.w, rnd() * this.h, rr, rr * TILT, 0, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case 5: // радиоактивные лужи
        for (let i = 0; i < 12; i++) {
          const x = rnd() * this.w;
          const y = rnd() * this.h;
          if (!far(x, y)) continue;
          const gr = c.createRadialGradient(x, y, 0, x, y, 26 * s);
          gr.addColorStop(0, 'rgba(166,255,77,0.35)');
          gr.addColorStop(1, 'rgba(166,255,77,0)');
          c.fillStyle = gr;
          c.fillRect(x - 30 * s, y - 30 * s, 60 * s, 60 * s);
        }
        break;
      case 6: // плитка лабораторий
        c.strokeStyle = 'rgba(140,120,180,0.08)';
        c.lineWidth = 1;
        for (let x = 0; x < this.w; x += 28 * s) {
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x, this.h);
          c.stroke();
        }
        for (let y = 0; y < this.h; y += 28 * s * TILT) {
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(this.w, y);
          c.stroke();
        }
        break;
      case 7: // светящиеся кабели комплекса ИИ
        c.strokeStyle = 'rgba(255,50,80,0.25)';
        c.lineWidth = 2 * s;
        for (let i = 0; i < 10; i++) {
          let x = rnd() * this.w;
          let y = rnd() * this.h;
          c.beginPath();
          c.moveTo(x, y);
          for (let k = 0; k < 4; k++) {
            if (rnd() < 0.5) x += (rnd() - 0.5) * 160 * s;
            else y += (rnd() - 0.5) * 160 * s;
            c.lineTo(x, y);
          }
          c.stroke();
        }
        break;
      default:
        break;
    }
  }

  /** Трансформация «земля»: круги превращаются в эллипсы. */
  private ground(): void {
    const s = this.scale * this.dpr;
    this.ctx.setTransform(s, 0, 0, s * TILT, this.cx * this.dpr, this.cy * this.dpr);
  }

  /** Трансформация «стоячие объекты»: мир сжат только по положению. */
  private upright(): void {
    const s = this.scale * this.dpr;
    this.ctx.setTransform(s, 0, 0, s, this.cx * this.dpr, this.cy * this.dpr);
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

    const alive = engine.enemies.filter((e) => e.alive).sort((a, b) => a.y - b.y);

    // Слой земли
    this.ground();
    this.drawRadius(engine);
    this.drawShadows(alive);
    this.drawBunkerBase(engine);
    this.drawRings(engine);
    this.drawBlasts(engine);

    // Стоячие объекты по глубине: что дальше — рисуется раньше.
    this.upright();
    let bunkerDone = false;
    for (const en of alive) {
      if (!bunkerDone && en.y >= 0) {
        this.drawBunker(engine);
        bunkerDone = true;
      }
      this.drawEnemy(en);
    }
    if (!bunkerDone) this.drawBunker(engine);
    this.drawBeams(engine);
    this.drawParticles(engine);
    this.drawLoot(engine);
    for (const en of alive) this.drawEnemyHud(en);
    if (this.showDamageNumbers) this.drawNumbers(engine);
  }

  private drawRadius(e: GameEngine): void {
    const c = this.ctx;
    const supp = e.bunker.suppressT > 0;
    e.stats.coils.forEach((coil, i) => {
      const col = supp ? '#b04dff' : modeConfig[coil.mode].color;
      const r = coil.radius;
      const g = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, col);
      c.globalAlpha = 0.12;
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.55;
      c.strokeStyle = col;
      c.lineWidth = 1.6;
      c.setLineDash([8, 7]);
      c.lineDashOffset = (i ? 1 : -1) * this.time * 14;
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
    });
    if (e.stats.detectRange > 0) {
      c.strokeStyle = 'rgba(95,224,138,0.14)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, e.stats.detectRange, 0, Math.PI * 2);
      c.stroke();
    }
  }

  private drawShadows(list: Enemy[]): void {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.42)';
    for (const en of list) {
      const hover = en.kind === 'support' || en.kind === 'shielded';
      const r = en.size * (hover ? 0.7 : 1.0);
      c.beginPath();
      c.arc(en.x, en.y, r, 0, Math.PI * 2);
      c.fill();
    }
  }

  private drawBunkerBase(e: GameEngine): void {
    const c = this.ctx;
    const R = gameConfig.bunkerBodyRadius;
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath();
    c.arc(4, 4, R * 1.55, 0, Math.PI * 2);
    c.fill();
    // бетонная площадка с сигнальным кольцом
    c.fillStyle = '#34383c';
    c.beginPath();
    c.arc(0, 0, R * 1.45, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = R * 0.14;
    c.strokeStyle = '#f2a93b';
    c.setLineDash([R * 0.22, R * 0.22]);
    c.beginPath();
    c.arc(0, 0, R * 1.36, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = '#15181a';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, R * 1.45, 0, Math.PI * 2);
    c.stroke();
    if (e.bunker.hitFlash > 0) {
      c.fillStyle = `rgba(255,60,40,${e.bunker.hitFlash * 1.5})`;
      c.fill();
    }
  }

  /** Купол бункера с катушками-башнями. */
  private drawBunker(e: GameEngine): void {
    const c = this.ctx;
    const R = gameConfig.bunkerBodyRadius;
    const W = R * 1.15;
    const H = R * 1.25;
    const charge = e.stats.capacity > 0 ? Math.min(1, e.bunker.energy / e.stats.capacity) : 0;
    const heat = e.stats.heatCap > 0 ? Math.min(1, e.bunker.heat / e.stats.heatCap) : 0;
    const supp = e.bunker.suppressT > 0;

    // нижний обод
    c.fillStyle = '#2a2e31';
    c.beginPath();
    c.ellipse(0, 0, W, W * TILT, 0, 0, Math.PI);
    c.fill();
    // купол
    const dg = c.createLinearGradient(-W, -H, W, 0);
    dg.addColorStop(0, '#9a9e9d');
    dg.addColorStop(0.5, '#62676a');
    dg.addColorStop(1, '#33373a');
    c.fillStyle = dg;
    c.strokeStyle = '#141618';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 0, W, H, 0, Math.PI, Math.PI * 2);
    c.ellipse(0, 0, W, W * TILT * 0.6, 0, 0, Math.PI);
    c.fill();
    c.stroke();
    // блик и швы
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 0, W * 0.8, H * 0.85, 0, Math.PI * 1.15, Math.PI * 1.45);
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(0, 0, W * 0.55, H, 0, Math.PI, Math.PI * 2);
    c.stroke();
    // сигнальная полоса
    c.fillStyle = '#f2a93b';
    c.beginPath();
    c.ellipse(0, -R * 0.08, W * 0.98, W * TILT * 0.55, 0, 0, Math.PI);
    c.ellipse(0, -R * 0.26, W * 0.96, W * TILT * 0.5, 0, Math.PI, 0, true);
    c.fill();
    // гермодверь с ядром
    c.fillStyle = '#25292c';
    c.strokeStyle = '#111';
    c.beginPath();
    c.roundRect(-R * 0.36, -R * 0.82, R * 0.72, R * 0.6, R * 0.12);
    c.fill();
    c.stroke();
    const core = c.createRadialGradient(0, -R * 0.52, 0, 0, -R * 0.52, R * 0.28);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.4, supp ? '#b04dff' : '#3fc8ff');
    core.addColorStop(1, 'rgba(20,80,120,0)');
    c.globalAlpha = 0.5 + charge * 0.5;
    c.fillStyle = core;
    c.beginPath();
    c.arc(0, -R * 0.52, R * 0.28, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;

    // башни катушек
    const towers = [-0.62, 0.62];
    e.stats.coils.slice(0, 2).forEach((coil, i) => {
      const tx = towers[i] * W;
      const base = -H * 0.72;
      const col = supp ? '#b04dff' : modeConfig[coil.mode].color;
      c.fillStyle = '#3a4046';
      c.strokeStyle = '#121416';
      c.lineWidth = 1.5;
      c.fillRect(tx - R * 0.08, base - R * 0.62, R * 0.16, R * 0.62);
      c.strokeRect(tx - R * 0.08, base - R * 0.62, R * 0.16, R * 0.62);
      for (let k = 0; k < 3; k++) {
        c.fillStyle = col;
        c.globalAlpha = 0.55 + 0.45 * charge;
        c.beginPath();
        c.roundRect(tx - R * 0.16, base - R * (0.18 + k * 0.17), R * 0.32, R * 0.07, R * 0.03);
        c.fill();
      }
      c.globalAlpha = 1;
      c.save();
      c.shadowColor = col;
      c.shadowBlur = 8 + charge * 14;
      c.fillStyle = col;
      c.beginPath();
      c.arc(tx, base - R * 0.72, R * 0.15, 0, Math.PI * 2);
      c.fill();
      c.restore();
    });
    // мачта сенсоров
    c.strokeStyle = '#4a5157';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -H);
    c.lineTo(0, -H - R * 0.45);
    c.stroke();
    c.strokeStyle = e.stats.detectRange > 0 ? '#5fe08a' : '#4a5157';
    c.beginPath();
    c.arc(0, -H - R * 0.38, R * 0.22, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke();

    if (heat > 0.4 || e.bunker.overheated) {
      const a = e.bunker.overheated ? 0.35 + 0.25 * Math.sin(this.time * 14) : (heat - 0.4) * 0.6;
      c.fillStyle = `rgba(255,90,40,${a * 0.6})`;
      c.beginPath();
      c.ellipse(0, 0, W, H, 0, Math.PI, Math.PI * 2);
      c.fill();
    }
    if (e.bunker.hitFlash > 0) {
      c.fillStyle = `rgba(255,60,40,${e.bunker.hitFlash * 2.5})`;
      c.beginPath();
      c.ellipse(0, 0, W, H, 0, Math.PI, Math.PI * 2);
      c.fill();
    }
  }

  private drawRings(e: GameEngine): void {
    const c = this.ctx;
    const R0 = gameConfig.bunkerBodyRadius;
    for (const r of e.visuals.rings) {
      const k = r.t / r.maxT;
      const rad = R0 + (r.radius - R0) * Math.min(1, k * 1.4);
      c.globalAlpha = 1 - k;
      c.strokeStyle = r.crit ? '#ffd75a' : r.color;
      c.lineWidth = (r.crit ? 6 : 4) * (1 - k * 0.6);
      c.beginPath();
      c.arc(0, 0, rad, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = (1 - k) * 0.3;
      c.lineWidth = 14 * (1 - k);
      c.stroke();
      c.globalAlpha = 1;
    }
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

  private drawEnemy(en: Enemy): void {
    const c = this.ctx;
    const ps = this.scale * this.dpr;
    const walking = !en.attacking;
    const frame = walking ? Math.floor(en.anim * 7) % 2 : 0;
    const spr = getSprite(en.kind, en.size, en.elite, ps, frame);
    const w = spr.width / ps;
    const foot = w * SPRITE_FOOT;
    const sy = en.y * TILT;
    const hover = en.kind === 'support' || en.kind === 'shielded';
    const bob = hover ? Math.sin(en.anim * 4) * en.size * 0.12 : walking ? -Math.abs(Math.sin(en.anim * 7 * Math.PI)) * en.size * 0.06 : 0;
    // атака: рывок к бункеру
    const lunge = en.attacking ? Math.max(0, Math.sin(this.time * 10)) * en.size * 0.15 : 0;
    const face = en.x > 0 ? -1 : 1;
    c.save();
    c.translate(en.x + face * lunge, sy + bob);
    c.scale(face, 1);
    c.drawImage(spr, -w / 2, -foot, w, w);
    if (en.hitFlash > 0) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.min(1, en.hitFlash * 4);
      c.drawImage(spr, -w / 2, -foot, w, w);
    }
    c.restore();
    void SPRITE_W;
  }

  /** Статусы, щиты и полосы здоровья поверх всех роботов. */
  private drawEnemyHud(en: Enemy): void {
    const c = this.ctx;
    const x = en.x;
    const base = en.y * TILT;
    const top = base - en.size * (en.isBoss ? 2.3 : 2.0);
    const mid = base - en.size;
    const st = en.status;
    if (st.slowT > 0) {
      c.strokeStyle = 'rgba(224,178,58,0.7)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(x, base, en.size * 1.1, en.size * 1.1 * TILT, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (st.burnT > 0) {
      c.fillStyle = `rgba(255,${120 + Math.random() * 60},40,0.6)`;
      c.beginPath();
      c.arc(x + (Math.random() - 0.5) * en.size, mid - Math.random() * en.size * 0.6, en.size * 0.3, 0, Math.PI * 2);
      c.fill();
    }
    if (st.stunT > 0) {
      c.fillStyle = '#ffe066';
      for (let i = 0; i < 3; i++) {
        const a = this.time * 6 + (i * Math.PI * 2) / 3;
        c.fillRect(x + Math.cos(a) * en.size * 0.8 - 1.5, top - 4 + Math.sin(a) * 2, 3, 3);
      }
    }
    if (st.shieldBreakT > 0 && Math.random() < 0.3) {
      c.strokeStyle = '#9fe8ff';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - en.size, mid);
      c.lineTo(x, mid - en.size * 0.5);
      c.lineTo(x + en.size, mid + 2);
      c.stroke();
    }
    if (en.auraArmor > 0) {
      c.strokeStyle = 'rgba(47,212,122,0.4)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(x, base, en.size * 1.4, en.size * 1.4 * TILT, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if (en.shield > 0) {
      c.strokeStyle = `rgba(110,190,255,${0.3 + 0.5 * (en.shield / en.maxShield)})`;
      c.fillStyle = `rgba(110,190,255,${0.06 + 0.1 * (en.shield / en.maxShield)})`;
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(x, mid, en.size * 1.25, en.size * 1.35, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    if (en.identified) {
      const r = en.size + 5;
      const l = 4;
      c.strokeStyle = 'rgba(95,224,138,0.85)';
      c.lineWidth = 1.2;
      c.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const yy = mid + sy * r;
        c.moveTo(x + sx * r, yy - sy * l);
        c.lineTo(x + sx * r, yy);
        c.lineTo(x + sx * (r - l), yy);
      }
      c.stroke();
    }
    if (st.jamT > 0) {
      c.fillStyle = 'rgba(95,224,138,0.7)';
      c.fillRect(x - 4, top - 8, 8, 2);
    }
    if (st.armorBreakT > 0) {
      c.fillStyle = 'rgba(166,255,77,0.6)';
      c.fillRect(x - en.size * 0.6, base + 2, en.size * 1.2, 2);
    }
    if (!en.isBoss && (en.hp < en.maxHp || en.elite || en.isMiniboss)) {
      const bw = Math.max(16, en.size * 2);
      const y = top - 4;
      c.fillStyle = 'rgba(0,0,0,0.75)';
      c.fillRect(x - bw / 2 - 1, y - 1, bw + 2, 5);
      c.fillStyle = en.elite || en.isMiniboss ? '#ffb02e' : '#e5483a';
      c.fillRect(x - bw / 2, y, (bw * en.hp) / en.maxHp, 3);
      if (en.maxShield > 0 && en.shield > 0) {
        c.fillStyle = '#6ebeff';
        c.fillRect(x - bw / 2, y - 2, (bw * en.shield) / en.maxShield, 1.5);
      }
    }
  }

  /** Точка мира → экран (стоячие координаты) с подъёмом над землёй. */
  private lift(x: number, y: number): [number, number] {
    const R = gameConfig.bunkerBodyRadius;
    if (Math.abs(x) < 1 && Math.abs(y) < 1) return [0, -R * 1.9];
    return [x, y * TILT - 12];
  }

  private drawBeams(e: GameEngine): void {
    const c = this.ctx;
    c.lineCap = 'round';
    for (const b of e.visuals.beams) {
      const k = 1 - b.t / b.maxT;
      const [x1, y1] = this.lift(b.x1, b.y1);
      const [x2, y2] = this.lift(b.x2, b.y2);
      const path = () => {
        c.beginPath();
        c.moveTo(x1, y1);
        if (b.jagged) {
          const n = 7;
          for (let i = 1; i < n; i++) {
            const t = i / n;
            c.lineTo(x1 + (x2 - x1) * t + (Math.random() - 0.5) * 12, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 12);
          }
        }
        c.lineTo(x2, y2);
      };
      path();
      c.strokeStyle = b.color;
      c.globalAlpha = k * 0.35;
      c.lineWidth = b.width * 3;
      c.stroke();
      c.globalAlpha = k;
      c.lineWidth = b.width;
      c.stroke();
      c.strokeStyle = '#ffffff';
      c.globalAlpha = k * 0.7;
      c.lineWidth = Math.max(1, b.width * 0.35);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  private drawParticles(e: GameEngine): void {
    const c = this.ctx;
    for (const p of e.visuals.particles) {
      const k = p.t / p.maxT;
      c.globalAlpha = 1 - k;
      c.fillStyle = p.color;
      // частицы подлетают и падают
      const up = Math.sin(Math.min(1, k) * Math.PI) * 14 + 4;
      c.fillRect(p.x - p.size / 2, p.y * TILT - up - p.size / 2, p.size, p.size);
    }
    c.globalAlpha = 1;
  }

  private drawLoot(e: GameEngine): void {
    const c = this.ctx;
    for (const l of e.visuals.loot) {
      const k = l.t / l.maxT;
      const ease = k * k;
      const x = l.x * (1 - ease);
      const y = l.y * TILT * (1 - ease) - Math.sin(k * Math.PI) * 44 - 12;
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
      const y = n.y * TILT - 26 - k * 22;
      c.globalAlpha = 1 - k * k;
      c.font = `${n.crit ? '16px' : '11px'} 'Russo One', system-ui, sans-serif`;
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(0,0,0,0.85)';
      c.strokeText(String(n.value), n.x, y);
      c.fillStyle = n.color;
      c.fillText(String(n.value), n.x, y);
    }
    c.globalAlpha = 1;
  }
}
