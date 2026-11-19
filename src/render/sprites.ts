import { bossesConfig, type BossLook } from '../game/config/bossesConfig';
import type { EnemyKind, RobotKind } from '../game/config/enemiesConfig';

// Спрайты роботов в виде сбоку (2.5D): рисуются процедурно один раз
// в offscreen-canvas. Робот смотрит вправо (+x), начало координат —
// точка на земле под центром. Для ходьбы — два кадра.

type Draw = (c: CanvasRenderingContext2D, s: number, elite: boolean, f: number) => void;

const metal = (elite: boolean) => (elite ? '#7a6630' : '#555b62');
const metalLight = (elite: boolean) => (elite ? '#d9b44a' : '#8d959c');
const metalDark = '#2a2e33';
const eye = '#ff3b30';

function shade(c: CanvasRenderingContext2D, x: number, y: number, _w: number, h: number, top: string, bottom: string): CanvasGradient {
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, r = 0) {
  c.fillStyle = fill;
  c.strokeStyle = '#111316';
  c.lineWidth = 1.4;
  c.beginPath();
  if (r > 0) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
  c.fill();
  c.stroke();
}

function glowDot(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  c.save();
  c.shadowColor = col;
  c.shadowBlur = r * 3;
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function leg(c: CanvasRenderingContext2D, hx: number, hy: number, kx: number, ky: number, fx: number, fy: number, w: number) {
  c.strokeStyle = '#1b1e22';
  c.lineWidth = w + 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(hx, hy);
  c.lineTo(kx, ky);
  c.lineTo(fx, fy);
  c.stroke();
  c.strokeStyle = '#3d4248';
  c.lineWidth = w;
  c.stroke();
}

function treads(c: CanvasRenderingContext2D, s: number, w: number, h: number, f: number) {
  box(c, -w, -h, w * 2, h, '#23262a', h / 2);
  c.fillStyle = '#4a4f55';
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = -w + h / 2 + ((w * 2 - h) * i) / (n - 1);
    c.beginPath();
    c.arc(x, -h / 2, h * 0.32, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#15171a';
  c.lineWidth = 1;
  for (let x = -w + ((f * s * 0.2) % (s * 0.4)); x < w; x += s * 0.4) {
    c.beginPath();
    c.moveTo(x, -h);
    c.lineTo(x, -h + h * 0.18);
    c.moveTo(x, 0);
    c.lineTo(x, -h * 0.18);
    c.stroke();
  }
}

const drawers: Record<RobotKind, Draw> = {
  // Лёгкий: паук-разведчик на четырёх ногах.
  light: (c, s, elite, f) => {
    const st = f ? 1 : -1;
    for (const [hx, fx] of [[-0.4, -1.0], [0.3, 0.95]] as const) {
      leg(c, hx * s, -s * 0.85, (hx + fx) * 0.6 * s, -s * 1.35, (fx + st * 0.12) * s, 0, s * 0.12);
      leg(c, hx * s, -s * 0.85, (hx + fx) * 0.5 * s, -s * 1.2, (fx * 0.6 - st * 0.12) * s, 0, s * 0.1);
    }
    c.fillStyle = shade(c, 0, -s * 1.3, 0, s * 0.8, metalLight(elite), metal(elite));
    c.strokeStyle = '#111316';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(s * 0.95, -s * 0.95);
    c.quadraticCurveTo(s * 0.2, -s * 1.45, -s * 0.85, -s * 1.0);
    c.quadraticCurveTo(-s * 0.2, -s * 0.55, s * 0.95, -s * 0.95);
    c.fill();
    c.stroke();
    glowDot(c, s * 0.55, -s * 1.02, s * 0.13, eye);
  },
  // Тяжёлый: танк на гусеницах с башней.
  heavy: (c, s, elite, f) => {
    treads(c, s, s * 0.95, s * 0.5, f);
    c.fillStyle = shade(c, 0, -s * 1.2, 0, s * 0.7, metalLight(elite), metal(elite));
    c.strokeStyle = '#111316';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-s * 0.9, -s * 0.5);
    c.lineTo(s * 0.95, -s * 0.5);
    c.lineTo(s * 0.7, -s * 1.1);
    c.lineTo(-s * 0.75, -s * 1.15);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#8f3a1e';
    c.fillRect(-s * 0.7, -s * 0.95, s * 0.35, s * 0.2);
    box(c, s * 0.35, -s * 1.5, s * 0.95, s * 0.16, metalDark);
    box(c, -s * 0.45, -s * 1.62, s * 0.95, s * 0.5, shade(c, 0, -s * 1.62, 0, s * 0.5, metalLight(elite), metal(elite)), s * 0.12);
    glowDot(c, s * 0.3, -s * 1.38, s * 0.09, eye);
  },
  // Дальнобойный: двуногий шагоход с длинной пушкой.
  ranged: (c, s, elite, f) => {
    const st = f ? 1 : -1;
    leg(c, -s * 0.1, -s * 1.05, -s * 0.45, -s * 0.55, -s * 0.1 + st * s * 0.25, 0, s * 0.14);
    leg(c, s * 0.1, -s * 1.05, -s * 0.25, -s * 0.55, s * 0.15 - st * s * 0.25, 0, s * 0.14);
    box(c, -s * 0.15, -s * 1.62, s * 1.55, s * 0.18, metalDark);
    c.fillStyle = '#ff5a4a';
    c.fillRect(s * 1.32, -s * 1.6, s * 0.1, s * 0.14);
    box(c, -s * 0.65, -s * 1.75, s * 1.0, s * 0.8, shade(c, 0, -s * 1.75, 0, s * 0.8, metalLight(elite), metal(elite)), s * 0.18);
    glowDot(c, s * 0.18, -s * 1.38, s * 0.12, eye);
  },
  // Поддержка: парящий ремонтный дрон.
  support: (c, s, elite, f) => {
    const y = -s * 1.35 - (f ? s * 0.08 : 0);
    const g = c.createRadialGradient(0, -s * 0.3, 0, 0, -s * 0.3, s * 0.9);
    g.addColorStop(0, 'rgba(47,212,122,0.45)');
    g.addColorStop(1, 'rgba(47,212,122,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-s * 0.35, y + s * 0.3);
    c.lineTo(s * 0.35, y + s * 0.3);
    c.lineTo(s * 0.7, -s * 0.05);
    c.lineTo(-s * 0.7, -s * 0.05);
    c.fill();
    c.fillStyle = shade(c, 0, y - s * 0.4, 0, s * 0.8, metalLight(elite), metal(elite));
    c.strokeStyle = '#111316';
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(0, y, s * 0.85, s * 0.38, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#2fd47a';
    c.fillRect(-s * 0.08, y - s * 0.25, s * 0.16, s * 0.5);
    c.fillRect(-s * 0.25, y - s * 0.08, s * 0.5, s * 0.16);
    c.strokeStyle = '#7d858c';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, y - s * 0.38);
    c.lineTo(-s * 0.15, y - s * 0.85);
    c.stroke();
    glowDot(c, -s * 0.15, y - s * 0.88, s * 0.08, '#2fd47a');
  },
  // Камикадзе: катящийся шипастый шар с раскалённым ядром.
  kamikaze: (c, s, elite, f) => {
    const cy = -s * 0.7;
    c.strokeStyle = '#3a3d41';
    c.lineWidth = 2.2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + f * 0.4;
      c.beginPath();
      c.moveTo(Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.5);
      c.lineTo(Math.cos(a) * s * 0.95, cy + Math.sin(a) * s * 0.95);
      c.stroke();
    }
    c.fillStyle = shade(c, 0, cy - s * 0.62, 0, s * 1.24, metalLight(elite), metal(elite));
    c.strokeStyle = '#111316';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(0, cy, s * 0.62, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    const g = c.createRadialGradient(s * 0.1, cy, 0, s * 0.1, cy, s * 0.35);
    g.addColorStop(0, '#fff3c4');
    g.addColorStop(0.5, '#ff7a1a');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(s * 0.1, cy, s * 0.35, 0, Math.PI * 2);
    c.fill();
    glowDot(c, s * 0.2, cy - s * 0.8, s * 0.07, f ? '#ffd166' : '#ff7a1a');
  },
  // Бронированный: тяжёлый человекоподобный мех со щитом.
  armored: (c, s, elite, f) => {
    const st = f ? 1 : -1;
    for (const k of [-1, 1]) box(c, k * s * 0.25 - s * 0.16 + st * k * s * 0.1, -s * 0.75, s * 0.32, s * 0.75, '#33373c', 3);
    box(c, -s * 0.7, -s * 1.85, s * 1.35, s * 1.15, shade(c, 0, -s * 1.85, 0, s * 1.15, metalLight(elite), metal(elite)), s * 0.15);
    c.fillStyle = '#9aa0a6';
    for (const [x, y] of [[-0.5, -1.7], [0.45, -1.7], [-0.5, -0.88], [0.45, -0.88]]) {
      c.beginPath();
      c.arc(x * s, y * s, s * 0.06, 0, Math.PI * 2);
      c.fill();
    }
    box(c, -s * 0.85, -s * 2.0, s * 0.7, s * 0.42, '#3a3f45', s * 0.15);
    box(c, s * 0.45, -s * 1.7, s * 0.38, s * 1.25, shade(c, 0, -s * 1.7, 0, s, '#6d747b', '#3a3f45'), s * 0.1);
    c.fillStyle = eye;
    c.fillRect(s * 0.05, -s * 1.62, s * 0.35, s * 0.1);
  },
  // Щитоносец: дрон с излучателями щита.
  shielded: (c, s, elite, f) => {
    const y = -s * 1.25 - (f ? s * 0.06 : 0);
    c.strokeStyle = 'rgba(110,190,255,0.75)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(s * 0.1, y, s * 1.05, -0.9, 0.9);
    c.stroke();
    c.fillStyle = shade(c, 0, y - s * 0.5, 0, s, metalLight(elite), metal(elite));
    c.strokeStyle = '#111316';
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(0, y, s * 0.72, s * 0.5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    glowDot(c, -s * 0.15, y - s * 0.62, s * 0.18, '#6ebeff');
    glowDot(c, -s * 0.15, y + s * 0.62, s * 0.18, '#6ebeff');
    glowDot(c, s * 0.38, y, s * 0.12, eye);
  },
  // Мини-босс: таран на гусеницах с бронированным носом.
  miniboss: (c, s, elite, f) => {
    treads(c, s, s * 1.0, s * 0.5, f);
    c.fillStyle = shade(c, 0, -s * 1.7, 0, s * 1.2, metalLight(elite), metal(elite));
    c.strokeStyle = '#111316';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-s * 0.95, -s * 0.5);
    c.lineTo(-s * 0.9, -s * 1.45);
    c.lineTo(-s * 0.3, -s * 1.75);
    c.lineTo(s * 0.55, -s * 1.6);
    c.lineTo(s * 0.8, -s * 0.5);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#8f3a1e';
    c.beginPath();
    c.moveTo(s * 1.25, -s * 0.85);
    c.lineTo(s * 0.6, -s * 1.4);
    c.lineTo(s * 0.75, -s * 0.5);
    c.closePath();
    c.fill();
    c.stroke();
    glowDot(c, s * 0.25, -s * 1.3, s * 0.16, eye);
  },
};

/** Босс: огромная машина на гусеницах, облик берётся из конфигурации. */
function drawBoss(c: CanvasRenderingContext2D, s: number, look: BossLook, f: number): void {
  treads(c, s, s * 1.05, s * 0.45, f);
  const top = -s * 2.0;
  c.fillStyle = shade(c, 0, top, 0, s * 1.6, '#9aa0a6', look.hull);
  c.strokeStyle = '#0e0f10';
  c.lineWidth = 3;
  c.beginPath();
  const n = Math.max(3, look.sides);
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    c.lineTo(Math.cos(a) * s * 1.0, -s * 0.45 + Math.sin(a) * s * 1.5);
  }
  c.closePath();
  c.fill();
  c.stroke();
  if (look.spikes) {
    c.fillStyle = '#5a5f66';
    for (let i = 1; i < n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const bx = Math.cos(a) * s * 1.0;
      const by = -s * 0.45 + Math.sin(a) * s * 1.5;
      c.beginPath();
      c.moveTo(bx - s * 0.1, by + s * 0.05);
      c.lineTo(bx * 1.15, by - s * 0.3);
      c.lineTo(bx + s * 0.1, by + s * 0.05);
      c.fill();
    }
  }
  for (let i = 0; i < look.guns; i++) {
    const y = -s * 0.75 - i * s * 0.28;
    box(c, s * 0.5, y - s * 0.08, s * 0.95, s * 0.16, '#3d3530');
  }
  const g = c.createRadialGradient(0, -s * 1.15, 0, 0, -s * 1.15, s * 0.4);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, look.core);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = '#1b1d20';
  c.beginPath();
  c.arc(0, -s * 1.15, s * 0.36, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, -s * 1.15, s * 0.4, 0, Math.PI * 2);
  c.fill();
}

const cache = new Map<string, HTMLCanvasElement>();

/** Размер спрайта относительно size и положение «ног» внутри канваса. */
export const SPRITE_W = 3.4;
export const SPRITE_FOOT = 0.84;

/** Возвращает кадр спрайта робота (вид сбоку, смотрит вправо). */
export function getSprite(kind: EnemyKind, size: number, elite: boolean, scale: number, frame = 0): HTMLCanvasElement {
  const px = Math.max(8, Math.round(size * scale));
  const key = `${kind}|${px}|${elite ? 1 : 0}|${frame}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(px * SPRITE_W);
  const c = cv.getContext('2d')!;
  c.translate(cv.width / 2, cv.height * SPRITE_FOOT);
  if (elite) {
    c.shadowColor = '#ffcc33';
    c.shadowBlur = px * 0.4;
  }
  if (kind.startsWith('boss:')) drawBoss(c, px, bossesConfig[kind.slice(5)].look, frame);
  else drawers[kind as RobotKind](c, px, elite, frame);
  cache.set(key, cv);
  return cv;
}

export function clearSpriteCache(): void {
  cache.clear();
}
