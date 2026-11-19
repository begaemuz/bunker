import { bossesConfig, type BossLook } from '../game/config/bossesConfig';
import type { EnemyKind, RobotKind } from '../game/config/enemiesConfig';

// Спрайты роботов рисуются процедурно один раз в offscreen-canvas.
// Каждый тип имеет узнаваемый силуэт, смотрит вправо (+x).

type Draw = (c: CanvasRenderingContext2D, s: number, elite: boolean) => void;

const metal = (elite: boolean) => (elite ? '#6b5a2a' : '#4a4f55');
const metalLight = (elite: boolean) => (elite ? '#c9a23a' : '#7d858c');
const eye = '#ff3b30';

function plate(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke = '#1a1c1f') {
  c.fillStyle = fill;
  c.strokeStyle = stroke;
  c.lineWidth = 1.2;
  c.beginPath();
  c.rect(x, y, w, h);
  c.fill();
  c.stroke();
}

const drawers: Record<RobotKind, Draw> = {
  // Лёгкий: узкий треугольный корпус на паучьих ножках.
  light: (c, s, elite) => {
    c.strokeStyle = '#2a2d31';
    c.lineWidth = 1.5;
    for (const sgn of [-1, 1]) {
      c.beginPath();
      c.moveTo(-s * 0.2, 0);
      c.lineTo(-s * 0.6, sgn * s * 0.9);
      c.moveTo(s * 0.2, 0);
      c.lineTo(s * 0.5, sgn * s * 0.95);
      c.stroke();
    }
    c.fillStyle = metal(elite);
    c.strokeStyle = '#1a1c1f';
    c.beginPath();
    c.moveTo(s, 0);
    c.lineTo(-s * 0.8, -s * 0.6);
    c.lineTo(-s * 0.5, 0);
    c.lineTo(-s * 0.8, s * 0.6);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = eye;
    c.beginPath();
    c.arc(s * 0.35, 0, s * 0.18, 0, Math.PI * 2);
    c.fill();
  },
  // Тяжёлый: широкий танк на гусеницах с бронеплитами.
  heavy: (c, s, elite) => {
    plate(c, -s * 0.9, -s, s * 1.8, s * 0.35, '#2b2e32');
    plate(c, -s * 0.9, s * 0.65, s * 1.8, s * 0.35, '#2b2e32');
    c.strokeStyle = '#3d4146';
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo((i * s) / 3.5, -s);
      c.lineTo((i * s) / 3.5, -s * 0.65);
      c.moveTo((i * s) / 3.5, s * 0.65);
      c.lineTo((i * s) / 3.5, s);
      c.stroke();
    }
    plate(c, -s * 0.75, -s * 0.65, s * 1.5, s * 1.3, metal(elite));
    plate(c, -s * 0.35, -s * 0.4, s * 0.8, s * 0.8, metalLight(elite));
    c.fillStyle = '#8f3a1e';
    c.fillRect(-s * 0.7, -s * 0.6, s * 0.25, s * 0.18);
    c.fillStyle = eye;
    c.fillRect(s * 0.45, -s * 0.12, s * 0.22, s * 0.24);
  },
  // Дальнобойный: ромб с длинным стволом.
  ranged: (c, s, elite) => {
    c.fillStyle = '#2a2d31';
    c.fillRect(s * 0.2, -s * 0.12, s * 1.1, s * 0.24);
    c.fillStyle = metal(elite);
    c.strokeStyle = '#1a1c1f';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(s * 0.6, 0);
    c.lineTo(0, -s * 0.8);
    c.lineTo(-s * 0.8, 0);
    c.lineTo(0, s * 0.8);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#ff5a4a';
    c.beginPath();
    c.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    c.fill();
  },
  // Поддержка: круглый дрон с антенной-крестом.
  support: (c, s, elite) => {
    c.fillStyle = metal(elite);
    c.strokeStyle = '#1a1c1f';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, 0, s * 0.8, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#2fd47a';
    c.fillRect(-s * 0.12, -s * 0.5, s * 0.24, s);
    c.fillRect(-s * 0.5, -s * 0.12, s, s * 0.24);
    c.strokeStyle = '#2fd47a';
    c.beginPath();
    c.arc(0, 0, s * 0.95, -0.6, 0.6);
    c.stroke();
  },
  // Камикадзе: сфера с шипами и ярким ядром.
  kamikaze: (c, s, elite) => {
    c.strokeStyle = '#3a3d41';
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5);
      c.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      c.stroke();
    }
    c.fillStyle = metal(elite);
    c.beginPath();
    c.arc(0, 0, s * 0.65, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ff7a1a';
    c.beginPath();
    c.arc(0, 0, s * 0.32, 0, Math.PI * 2);
    c.fill();
  },
  // Мини-босс: шестиугольный таран с бронированным носом.
  miniboss: (c, s, elite) => {
    c.fillStyle = '#2b2e32';
    c.fillRect(-s * 0.9, -s * 0.95, s * 1.6, s * 0.3);
    c.fillRect(-s * 0.9, s * 0.65, s * 1.6, s * 0.3);
    c.fillStyle = metal(elite);
    c.strokeStyle = '#141517';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = s * 0.8;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#8f3a1e';
    c.beginPath();
    c.moveTo(s * 1.05, 0);
    c.lineTo(s * 0.55, -s * 0.5);
    c.lineTo(s * 0.55, s * 0.5);
    c.closePath();
    c.fill();
    c.fillStyle = eye;
    c.beginPath();
    c.arc(0, 0, s * 0.22, 0, Math.PI * 2);
    c.fill();
  },
  // Бронированный: квадратный корпус в толстых плитах с заклёпками.
  armored: (c, s, elite) => {
    plate(c, -s, -s * 0.9, s * 2, s * 1.8, '#2a2c2f');
    plate(c, -s * 0.8, -s * 0.7, s * 1.6, s * 1.4, metal(elite));
    c.fillStyle = '#9aa0a6';
    for (const [x, y] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]]) {
      c.beginPath();
      c.arc(x * s, y * s, s * 0.08, 0, Math.PI * 2);
      c.fill();
    }
    plate(c, s * 0.5, -s * 0.25, s * 0.45, s * 0.5, metalLight(elite));
    c.fillStyle = eye;
    c.fillRect(s * 0.75, -s * 0.08, s * 0.15, s * 0.16);
  },
  // Щитоносец: дрон с излучателями щита по бокам.
  shielded: (c, s, elite) => {
    c.fillStyle = metal(elite);
    c.strokeStyle = '#1a1c1f';
    c.lineWidth = 1.2;
    c.beginPath();
    c.ellipse(0, 0, s * 0.7, s * 0.55, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#6ebeff';
    for (const sgn of [-1, 1]) {
      c.beginPath();
      c.arc(0, sgn * s * 0.75, s * 0.22, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = eye;
    c.beginPath();
    c.arc(s * 0.35, 0, s * 0.15, 0, Math.PI * 2);
    c.fill();
  },
};

/** Босс рисуется по описанию внешнего вида из конфигурации. */
function drawBoss(c: CanvasRenderingContext2D, s: number, look: BossLook): void {
  c.fillStyle = look.hull;
  c.strokeStyle = '#0e0f10';
  c.lineWidth = 3;
  c.beginPath();
  for (let i = 0; i < look.sides; i++) {
    const a = (i / look.sides) * Math.PI * 2 + Math.PI / look.sides;
    c.lineTo(Math.cos(a) * s, Math.sin(a) * s);
  }
  c.closePath();
  c.fill();
  c.stroke();
  if (look.spikes) {
    c.fillStyle = '#5a5f66';
    for (let i = 0; i < look.sides; i++) {
      const a = (i / look.sides) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a - 0.12) * s * 0.95, Math.sin(a - 0.12) * s * 0.95);
      c.lineTo(Math.cos(a) * s * 1.25, Math.sin(a) * s * 1.25);
      c.lineTo(Math.cos(a + 0.12) * s * 0.95, Math.sin(a + 0.12) * s * 0.95);
      c.fill();
    }
  }
  c.fillStyle = '#4a3a30';
  for (let i = 0; i < look.guns; i++) {
    const off = (i - (look.guns - 1) / 2) * s * 0.35;
    c.fillRect(s * 0.2, off - s * 0.08, s * 0.95, s * 0.16);
  }
  c.fillStyle = '#5a5f66';
  c.beginPath();
  c.arc(0, 0, s * 0.58, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 0.35);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, look.core);
  g.addColorStop(1, '#000000');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, s * 0.35, 0, Math.PI * 2);
  c.fill();
}

const cache = new Map<string, HTMLCanvasElement>();

/** Возвращает спрайт робота. Размер канваса = 3 × size, центр — середина. */
export function getSprite(kind: EnemyKind, size: number, elite: boolean, scale: number): HTMLCanvasElement {
  const px = Math.max(8, Math.round(size * scale));
  const key = `${kind}|${px}|${elite ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = px * 3;
  const c = cv.getContext('2d')!;
  c.translate(px * 1.5, px * 1.5);
  if (elite) {
    c.shadowColor = '#ffcc33';
    c.shadowBlur = px * 0.5;
  }
  if (kind.startsWith('boss:')) drawBoss(c, px, bossesConfig[kind.slice(5)].look);
  else drawers[kind as RobotKind](c, px, elite);
  cache.set(key, cv);
  return cv;
}

export function clearSpriteCache(): void {
  cache.clear();
}
