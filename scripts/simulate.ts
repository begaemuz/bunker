/* Проверка игровой логики без браузера: тесты механик и прогон баланса.
   Запуск: npm run sim */
import { computeBunkerStats } from '../src/game/bunker/BunkerStats';
import { balanceConfig } from '../src/game/config/balanceConfig';
import { getMap } from '../src/game/config/mapsConfig';
import { GameEngine } from '../src/game/engine/GameEngine';
import { generateItem, sellPrice } from '../src/game/items/ItemGenerator';
import { rarityIndex, validateRarityTable } from '../src/game/items/ItemRarity';
import {
  addItems,
  addResources,
  addXp,
  createNewProfile,
  equipItem,
  sellItem,
  type Profile,
} from '../src/game/profile/Profile';
import { migrate } from '../src/services/migrations';
import { setSeed } from '../src/game/rng';
import { EQUIP_CATEGORIES, RARITIES } from '../src/game/types';

let failures = 0;
function check(name: string, cond: boolean): void {
  if (!cond) {
    failures++;
    console.log(`  ✗ ${name}`);
  } else console.log(`  ✓ ${name}`);
}

setSeed(12345);

console.log('— Конфигурация');
check('Шансы редкости = 100%', validateRarityTable(balanceConfig.rarityChances));
check('Шансы мини-босса = 100%', validateRarityTable(balanceConfig.minibossRarityChances));
check('Шансы босса = 100%', validateRarityTable(balanceConfig.bossRarityChances));

console.log('— Предметы');
{
  let slotsOk = true;
  let extrasOk = true;
  const ids = new Set<string>();
  for (const r of RARITIES) {
    for (let i = 0; i < 200; i++) {
      const it = generateItem({ rarity: r, source: { kind: 'start' } });
      ids.add(it.id);
      const [mn, mx] = balanceConfig.raritySlots[r];
      if (it.slots.length < mn || it.slots.length > mx) slotsOk = false;
      const [emn, emx] = balanceConfig.rarityExtraCount[r];
      if (it.extraStats.length < emn || it.extraStats.length > emx) extrasOk = false;
    }
  }
  check('Количество слотов по правилам редкости', slotsOk);
  check('Количество доп. свойств по редкости', extrasOk);
  check('Уникальные ID', ids.size === RARITIES.length * 200);
  const a = generateItem({ templateId: 'coil_pulse', rarity: 'epic', source: { kind: 'start' } });
  const b = generateItem({ templateId: 'coil_pulse', rarity: 'epic', source: { kind: 'start' } });
  check('Два экземпляра одного шаблона различаются', JSON.stringify(a.baseStats) !== JSON.stringify(b.baseStats));
  const c = generateItem({ templateId: 'coil_pulse', rarity: 'common', source: { kind: 'start' } });
  const l = generateItem({ templateId: 'coil_pulse', rarity: 'legendary', source: { kind: 'start' } });
  check('Редкость усиливает характеристики', l.baseStats[0].value > c.baseStats[0].value);
  check('Цена продажи растёт с редкостью', sellPrice(l) > sellPrice(c));
}

console.log('— Экипировка и характеристики');
{
  let p = createNewProfile();
  const s0 = computeBunkerStats(p);
  check('Стартовый урон > базового (стартовая катушка)', s0.damage > 30);
  const coil = generateItem({ templateId: 'coil_wide', rarity: 'legendary', source: { kind: 'start' } });
  p = addItems(p, [coil]).profile;
  const wrong = equipItem(p, coil.id, 'generator');
  check('Нельзя установить в неподходящий слот', wrong.error === 'wrong_category');
  const ok = equipItem(p, coil.id, 'coil', 0);
  check('Установка в подходящий слот', !ok.error);
  const s1 = computeBunkerStats(ok.profile);
  check('Экипировка меняет радиус', s1.radius > s0.radius);
  const sellEq = sellItem(ok.profile, coil.id);
  check('Нельзя продать установленный предмет', sellEq.error === 'equipped');
  const sold = sellItem(p, coil.id);
  check('Продажа начисляет монеты', !sold.error && sold.profile.resources.coins === p.resources.coins + sellPrice(coil));
  const half = computeBunkerStats(ok.profile, 0.5);
  check('Дефицит энергии снижает бонусы, но не ядро', half.radius < s1.radius && half.radius >= 150);
  const lv = addXp(p, 10_000);
  check('Опыт повышает уровень', lv.profile.bunker.level > 1);
  check('Уровень повышает урон', computeBunkerStats(lv.profile).damage > s0.damage);
  const res = addResources(p, { coins: -1_000_000 });
  check('Ресурсы не уходят в минус', res.resources.coins === 0);
}

console.log('— Бой');
{
  const p = createNewProfile();
  const map = getMap(1);
  const eng = new GameEngine(map, (eff) => computeBunkerStats(p, eff));
  eng.wave = 1;
  const inside = eng.spawnEnemy('heavy', false, 100, 0);
  const outside = eng.spawnEnemy('heavy', false, 400, 0);
  const hpIn = inside.hp;
  const hpOut = outside.hp;
  eng.firePulse(1, false);
  check('Импульс бьёт робота в радиусе', inside.hp < hpIn);
  check('Импульс не бьёт робота вне радиуса', outside.hp === hpOut);

  const eng2 = new GameEngine(map, (eff) => computeBunkerStats(p, eff));
  eng2.phase = 'clearing';
  eng2.wave = 1;
  const rate = eng2.stats.pulseRate;
  for (let i = 0; i < 600; i++) eng2.update(1 / 60);
  check(`Частота импульсов соответствует (${eng2.run.pulses} за 10 с при ${rate.toFixed(2)}/с)`, Math.abs(eng2.run.pulses - rate * 10) <= 1);

  const eng3 = new GameEngine(map, (eff) => computeBunkerStats(p, eff));
  eng3.wave = 1;
  eng3.phase = 'clearing';
  const hp0 = eng3.bunker.hp;
  eng3.damageBunker(100, 'kinetic');
  check('Бункер получает урон', eng3.bunker.hp < hp0);
  eng3.damageBunker(1e9, 'kinetic');
  check('При нулевом HP — поражение', eng3.state === 'defeat');
}

console.log('— Сохранения');
{
  const p = createNewProfile();
  const old = { ...p, version: 1 } as Partial<Profile> & { version: number };
  delete (old as { history?: unknown }).history;
  const m = migrate(old);
  check('Миграция старой версии сохранения', m.version === createNewProfile().version && Array.isArray(m.history));
}

// ─────────────── Прогон баланса ───────────────
console.log('— Баланс: попытки пройти карту 1 с автоэкипировкой');
{
  setSeed(777);
  let p = createNewProfile();
  const map = getMap(1);
  const score = (it: { rarity: (typeof RARITIES)[number]; baseStats: { value: number }[] }) =>
    rarityIndex(it.rarity) * 10 + it.baseStats.length;
  for (let attempt = 1; attempt <= 20; attempt++) {
    const eng = new GameEngine(map, (eff) => computeBunkerStats(p, eff));
    eng.setViewport(220, 340);
    eng.on((ev) => {
      if (ev.type === 'kill') {
        p = addResources(p, ev.loot.resources);
        p = addItems(p, ev.loot.items).profile;
        const before = p.bunker.level;
        p = addXp(p, ev.xp).profile;
        if (p.bunker.level !== before) eng.refreshStats();
      }
    });
    let t = 0;
    while (eng.state === 'running' && t < 60 * 30) {
      eng.update(1 / 60);
      t += 1 / 60;
    }
    const s = computeBunkerStats(p);
    console.log(
      `  попытка ${attempt}: ${eng.state === 'victory' ? 'ПОБЕДА' : 'поражение'} на волне ${eng.wave}, ` +
        `время ${Math.round(eng.run.time)}с, убито ${eng.run.kills}, предметов ${eng.run.items.length}, ` +
        `ур. ${p.bunker.level}, DPS ${Math.round(s.singleTargetDps)}, радиус ${Math.round(s.radius)}, HP ${s.maxHp}, ` +
        `энергия ${s.energy.balance >= 0 ? '+' : ''}${s.energy.balance}`,
    );
    // Автоэкипировка: лучший предмет каждой категории.
    for (const c of EQUIP_CATEGORIES) {
      const best = Object.values(p.items)
        .filter((i) => i.category === c)
        .sort((a, b) => score(b) - score(a))[0];
      if (best) p = equipItem(p, best.id, c, 0).profile;
    }
    if (eng.state === 'victory') break;
  }
}

if (failures > 0) {
  console.log(`\n${failures} проверок не пройдено`);
  process.exit(1);
}
console.log('\nВсе проверки пройдены');
