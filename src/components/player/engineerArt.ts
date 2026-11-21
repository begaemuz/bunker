// Рисунки инженеров: портрет для аватара и фигура для лаборатории бункера.
// Файлы названы m0–m7 (мужчины) и f0–f7 (женщины), как номера в AVATARS: 0–7 и 8–15.
const avatarFiles = import.meta.glob<string>('../../assets/avatars/*.webp', { eager: true, import: 'default' });
const engineerFiles = import.meta.glob<string>('../../assets/engineers/*.webp', { eager: true, import: 'default' });

const fileName = (id: number) => `${id >= 8 ? 'f' : 'm'}${id % 8}.webp`;

function pick(files: Record<string, string>, dir: string, id: number): string {
  return files[`../../assets/${dir}/${fileName(id)}`] ?? files[`../../assets/${dir}/m0.webp`];
}

export const avatarUrl = (id: number) => pick(avatarFiles, 'avatars', id);
export const engineerUrl = (id: number) => pick(engineerFiles, 'engineers', id);

/**
 * Где стоит фигура в сцене лаборатории (координаты viewBox 200×262):
 * лицо по центру, низ уходит под стол.
 */
const ENGINEER_FIT: Record<number, [x: number, y: number, w: number, h: number]> = {
  0: [41, 90, 123.3, 144.5],
};

export function engineerFit(id: number) {
  const [x, y, w, h] = ENGINEER_FIT[id] ?? ENGINEER_FIT[0];
  return { x, y, w, h };
}
