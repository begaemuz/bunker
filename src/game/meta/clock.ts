// Игровое время: единое для всех игроков. Сутки, недели и месяцы
// считаются по времени сервера (Москва, UTC+3), а не по часам телефона.

/** Смещение часового пояса сервера от UTC, мс. */
export const SERVER_TZ_OFFSET = 3 * 3600_000;
export const SERVER_TZ_NAME = 'МСК';

let skew = 0;

/** Поправка часов устройства по ответу сервера. */
export function setServerTime(serverNow: number): void {
  if (Number.isFinite(serverNow) && serverNow > 0) skew = serverNow - Date.now();
}

/** Текущее время по серверу (UTC, мс). */
export function gameNow(): number {
  return Date.now() + skew;
}

/** Дата в часовом поясе сервера: читать через getUTC*. */
export function serverDate(t = gameNow()): Date {
  return new Date(t + SERVER_TZ_OFFSET);
}

/** Время сервера строкой «ЧЧ:ММ». */
export function serverClock(t = gameNow()): string {
  const d = serverDate(t);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
