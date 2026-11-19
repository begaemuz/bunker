/* Проверка игровой логики без браузера: тесты механик и прогон баланса.
   Запуск: npm run sim */
import { computeBunkerStats } from '../src/game/bunker/BunkerStats';
import { upgradeHints } from '../src/game/bunker/compare';
import { techConfig } from '../src/game/config/techConfig';
import { getLocation, locationsConfig } from '../src/game/config/locationsConfig';
import { bossesConfig } from '../src/game/config/bossesConfig';
import { rollBossLoot } from '../src/game/economy/DropSystem';
import { GameEngine } from '../src/game/engine/GameEngine';
import { generateItem, sellPrice } from '../src/game/items/ItemGenerator';
import { rarityIndex, validateRarityTable } from '../src/game/items/ItemRarity';
import { tryUpgrade, upgradeBlock } from '../src/game/items/ItemUpgrade';
import {
  addGroupKill,
  addItems,
  addResources,
  addXp,
  canSummonBoss,
  consumeSummon,
  createNewProfile,
  ensureMinimumKit,
  equipItem,
  isEquipped,
  registerBossKill,
  sellItem,
  setCurrentLocation,
} from '../src/game/profile/Profile';
import { research, researchBlock } from '../src/game/progression/TechnologyTree';
import { rewardDecay } from '../src/game/progression/rewards';
import { migrate } from '../src/services/migrations';
import { setSeed } from '../src/game/rng';
import { RARITIES, SLOT_CATEGORY, SLOT_IDS, type Item } from '../src/game/types';

let failures = 0;
function check(name: string, cond: boolean): void {
  if (!cond) {
    failures++;
    console.log(`  ✗ ${name}`);
  } else console.log(`  ✓ ${name}`);
}

setSeed(12345);

console.log('— Конфигурация');
for (const l of locationsConfig) check(`Шансы редкости локации ${l.id} = 100%`, validateRarityTable(l.rarity));

console.log('— Оборудование');
{
  const ids = new Set<string>();
  for (const r of RARITIES.filter((x) => x !== 'unique'))
    for (let i = 0; i < 100; i++) ids.add(generateItem({ rarity: r, tier: 1, source: { kind: 'start' } }).id);
  check('Уникальные ID экземпляров', ids.size === 500);
  const c = generateItem({ templateId: 'coil_emp', rarity: 'common', tier: 1, source: { kind: 'start' } });
  const l = generateItem({ templateId: 'coil_emp', rarity: 'legendary', tier: 1, source: { kind: 'start' } });
  const t3 = generateItem({ templateId: 'coil_emp', rarity: 'common', tier: 3, source: { kind: 'start' } });
  check('Редкость усиливает катушку', l.coil!.power > c.coil!.power);
  check('Технологический уровень усиливает катушку', t3.coil!.power > c.coil!.power);
  check('Мощная катушка дороже по энергии', l.coil!.energyPerPulse > c.coil!.energyPerPulse);
  const u = generateItem({ templateId: 'u_twins', rarity: 'common', tier: 2, source: { kind: 'start' } });
  check('Уникальный шаблон: редкость «Уникальное» и особое свойство', u.rarity === 'unique' && u.unique?.kind === 'dualCoil');
}

console.log('— Слоты и экипировка');
{
  let p = createNewProfile();
  check('8 физических слотов', SLOT_IDS.length === 8);
  const coil = generateItem({ templateId: 'coil_hv', rarity: 'rare', tier: 1, source: { kind: 'start' } });
  p = addItems(p, [coil]).profile;
  check('Нельзя поставить катушку в слот генератора', equipItem(p, coil.id, 'generator').error === 'wrong_category');
  const s0 = computeBunkerStats(p);
  p = equipItem(p, coil.id, 'coil2').profile;
  const s1 = computeBunkerStats(p);
  check('Две катушки работают одновременно', s0.coils.length === 1 && s1.coils.length === 2);
  check('Катушки имеют независимые режимы', s1.coils[0].mode !== s1.coils[1].mode);
  const moved = equipItem(p, coil.id, 'coil1').profile;
  check('Перенос катушки не дублирует предмет', moved.equipment.coil1 === coil.id && moved.equipment.coil2 === null);
  check('Нельзя продать установленный предмет', sellItem(p, coil.id).error === 'equipped');
  check('Вторая катушка упирается в энергию стартового генератора', s1.energyFactor < 1);
  const gen = generateItem({ templateId: 'gen_reactor', rarity: 'epic', tier: 1, source: { kind: 'start' } });
  p = addItems(p, [gen]).profile;
  const s2 = computeBunkerStats(equipItem(p, gen.id, 'generator').profile);
  check('Мощный генератор снимает ограничение энергии', s2.energyFactor > s1.energyFactor);
  check('Реактор повышает нагрев катушек', s2.coils[0].heatPerSec > s1.coils[0].heatPerSec);
  const noGen = computeBunkerStats({ ...p, equipment: { ...p.equipment, generator: null } });
  check('Без генератора катушкам нечем питаться', noGen.energyFactor === 0);
  const sold = sellItem(p, gen.id);
  check('Продажа начисляет монеты', !sold.error && sold.profile.resources.coins === p.resources.coins + sellPrice(gen));
}

console.log('— Подсказка «лучше установленного»');
{
  let p = createNewProfile();
  const good = generateItem({ templateId: 'gen_diesel', rarity: 'legendary', tier: 2, source: { kind: 'start' } });
  const bad = { ...generateItem({ templateId: 'gen_diesel', rarity: 'common', tier: 1, source: { kind: 'start' } }) };
  bad.baseStats = [{ stat: 'genPower', value: 5 }];
  const shield = generateItem({ templateId: 'sh_armor', rarity: 'common', tier: 1, source: { kind: 'start' } });
  p = addItems(p, [good, bad, shield]).profile;
  const hints = upgradeHints(p);
  check('Лучший генератор отмечен стрелкой', hints.has(good.id));
  check('Слабый генератор не отмечен', !hints.has(bad.id));
  check('Предмет в пустой слот отмечен', hints.get(shield.id)?.slot === 'shield');
  check('Установленные предметы не отмечаются', !hints.has(p.equipment.generator!));
}

console.log('— Технологии и уровень');
{
  let p = createNewProfile();
  const s0 = computeBunkerStats(p);
  const lv = addXp(p, 1_000_000).profile;
  check('Уровень бункера не повышает характеристики напрямую', computeBunkerStats(lv).coils[0].power === s0.coils[0].power);
  check('Технология недоступна без ресурсов', researchBlock(p, techConfig.find((t) => t.id === 'm_power')!) === 'resources');
  p = addResources(p, { coins: 10_000, techParts: 500, scrap: 500, blueprints: 50 });
  const r = research(p, 'm_power');
  check('Исследование списывает ресурсы', !r.error && r.profile.resources.coins < p.resources.coins);
  check('Технология усиливает катушки', computeBunkerStats(r.profile).coils[0].power > s0.coils[0].power);
  check('Требование уровня бункера', research(p, 'e_drain').error === 'level');
}

console.log('— Улучшение оборудования');
{
  let p = addResources(createNewProfile(), { coins: 1e7, scrap: 1e6, techParts: 1e6, energyCores: 1000, stabilizers: 1000 });
  p = addXp(p, 1e8).profile;
  let destroyed = 0;
  let protectedFails = 0;
  let ok = 0;
  for (let i = 0; i < 300; i++) {
    const it = generateItem({ templateId: 'coil_emp', rarity: 'common', tier: 1, source: { kind: 'start' } });
    let q = addItems(p, [it]).profile;
    q = { ...q, items: { ...q.items, [it.id]: { ...it, level: 9 } } };
    const r = tryUpgrade(q, it.id, false);
    if (r.outcome === 'destroyed') destroyed++;
    if (r.outcome === 'success') ok++;
    const r2 = tryUpgrade(q, it.id, true);
    if (r2.outcome === 'failed_protected' && r2.profile.items[it.id]) protectedFails++;
  }
  check(`Неудача без защиты уничтожает предмет (${destroyed}/300)`, destroyed > 100 && ok > 50);
  check('Стабилизатор сохраняет предмет при неудаче', protectedFails > 100);
  const id = p.equipment.coil1!;
  const before = computeBunkerStats(p).coils[0].power;
  let up = tryUpgrade(p, id, true);
  for (let i = 0; i < 10 && up.outcome !== 'success'; i++) up = tryUpgrade(p, id, true);
  check('Улучшение повышает мощность', up.outcome === 'success' && computeBunkerStats(up.profile).coils[0].power > before);
  const fresh = addResources(createNewProfile(), { coins: 1e6, scrap: 1e6, techParts: 1e6 });
  const fid = fresh.equipment.coil1!;
  const f3 = { ...fresh, items: { ...fresh.items, [fid]: { ...fresh.items[fid], level: 3 } } };
  check('Уровень оборудования ограничен уровнем бункера', upgradeBlock(f3, f3.items[fid], false) === 'bunker');
  const hi = { ...p, items: { ...p.items, [id]: { ...p.items[id], level: 9 } } };
  let d = tryUpgrade(hi, id, false);
  for (let i = 0; i < 50 && d.outcome !== 'destroyed'; i++) d = tryUpgrade(hi, id, false);
  check('Уничтоженный предмет снимается со слота', d.outcome === 'destroyed' && d.profile.equipment.coil1 === null && !d.profile.items[id]);
}

console.log('— Бой');
{
  const p = createNewProfile();
  const loc = getLocation(1);
  const eng = new GameEngine(loc, () => computeBunkerStats(p));
  const inside = eng.spawnEnemy('heavy', false, 100, 0);
  const outside = eng.spawnEnemy('heavy', false, 400, 0);
  const hpIn = inside.hp;
  for (let i = 0; i < 90; i++) eng.update(1 / 60);
  check('Катушка бьёт робота в радиусе', inside.hp < hpIn);
  check('Катушка не бьёт робота вне радиуса', outside.hp === outside.maxHp);

  const e2 = new GameEngine(loc, () => computeBunkerStats(p));
  let groups = 0;
  e2.on((ev) => {
    if (ev.type === 'groupCleared') groups++;
  });
  for (let i = 0; i < 60 * 120; i++) e2.update(1 / 60);
  check(`Роботы появляются непрерывно, группы уничтожаются (${groups} за 2 мин)`, groups >= 5 && e2.aliveCount > 0);

  const e3 = new GameEngine(loc, () => computeBunkerStats(p));
  for (let i = 0; i < 600; i++) e3.update(1 / 60);
  e3.summonBoss();
  check('При вызове босса обычные роботы исчезают', e3.enemies.filter((e) => e.alive).length === 1 && !!e3.boss);
  for (let i = 0; i < 600; i++) e3.update(1 / 60);
  check('Во время боя с боссом новые группы не появляются', e3.enemies.filter((e) => e.alive && e.groupId > 0).length === 0);

  let pr = createNewProfile();
  for (let i = 0; i < 10; i++) pr = addGroupKill(pr, 1);
  check('После 10 групп можно вызвать босса', canSummonBoss(pr, 1));
  check('Без пропуска и прогресса вызвать нельзя', consumeSummon(createNewProfile(), 1, false) === null);
  const withPass = addResources(createNewProfile(), { bossPasses: 1 });
  check('Пропуск позволяет вызвать босса', consumeSummon(withPass, 1, true)?.resources.bossPasses === 0);
  const won = registerBossKill(pr, 1);
  check('Победа над боссом открывает следующую локацию', won.unlocked === 2 && won.profile.locations.unlocked.includes(2));
  check('Можно вернуться на предыдущую локацию', setCurrentLocation(setCurrentLocation(won.profile, 2), 1).locations.current === 1);
  let uniques = 0;
  for (let i = 0; i < 500; i++)
    uniques += rollBossLoot('colossus', { location: getLocation(1), decay: 1, dropChanceMult: 1, coinMult: 1 }).items.filter((x) => x.rarity === 'unique').length;
  check(`Уникальные предметы босса выпадают с настраиваемым шансом (${uniques}/500)`, uniques > 60 && uniques < 160);
  check('Снижение наград за слабых противников', rewardDecay(30, getLocation(1)) < rewardDecay(5, getLocation(1)));
}

console.log('— Сохранения');
{
  const v2 = {
    version: 2,
    bunker: { level: 7, xp: 10 },
    resources: { coins: 500, techParts: 3, energyCores: 0, crystals: 0, scrap: 9, stabilizers: 2 },
    items: {
      a: { id: 'a', templateId: 'coil_tesla', category: 'coil', rarity: 'epic', level: 3, obtainedAt: 1 },
      b: { id: 'b', templateId: 'reac_compact', category: 'reactor', rarity: 'rare', level: 1, obtainedAt: 2 },
    },
    equipment: { generator: [null], coil: ['a'], capacitor: [null], reactor: ['b'] },
    maps: { unlocked: [1], selected: 1, bestWave: { 1: 11 }, bossKills: { 1: 1 } },
    stats: { robotsKilled: 100 },
    history: [],
  };
  const m = migrate(v2);
  check('Миграция v2 → v3: уровень и ресурсы сохранены', m.bunker.level === 7 && m.resources.coins === 500);
  check('Миграция: предметы сохранили ID, редкость и уровень', m.items.a?.rarity === 'epic' && m.items.a.level === 3 && m.items.a.category === 'coil');
  check('Миграция: реактор стал генератором и остался установлен', m.items.b?.category === 'generator' && m.equipment.generator === 'b');
  check('Миграция: победа над боссом открыла 2-ю локацию', m.locations.unlocked.includes(2));
  check('Миграция: стоит катушка №1', m.equipment.coil1 === 'a');
}

// ─────────────── Прогон баланса ───────────────
const HOURS = Number(process.env.SIM_HOURS ?? 3);
console.log(`— Баланс: автоигрок, ${HOURS} ч игрового времени`);
{
  setSeed(777);
  let p = createNewProfile();
  const scoreItem = (it: Item) => rarityIndex(it.rarity) * 10 + it.tier * 12 + it.level * 2;
  const bestLayout = () => {
    for (const slot of SLOT_IDS) {
      if (slot === 'coil1' || slot === 'coil2') continue;
      const cat = SLOT_CATEGORY[slot];
      const best = Object.values(p.items)
        .filter((i) => i.category === cat)
        .sort((a, b) => scoreItem(b) - scoreItem(a))[0];
      if (best && p.equipment[slot] !== best.id) p = equipItem(p, best.id, slot).profile;
    }
    const coils = Object.values(p.items)
      .filter((i) => i.category === 'coil')
      .sort((a, b) => scoreItem(b) - scoreItem(a))
      .slice(0, 6);
    let pair: [string | null, string | null] = [p.equipment.coil1, p.equipment.coil2];
    let bestDps = computeBunkerStats(p).sustainedDps;
    for (const a of coils)
      for (const b of [null, ...coils]) {
        if (b && a.id === b.id) continue;
        const d = computeBunkerStats(p, { ...p.equipment, coil1: a.id, coil2: b?.id ?? null }).sustainedDps;
        if (d > bestDps * 1.02) {
          bestDps = d;
          pair = [a.id, b?.id ?? null];
        }
      }
    p = { ...p, equipment: { ...p.equipment, coil1: pair[0], coil2: pair[1] } };
  };
  const spendAll = () => {
    for (let k = 0; k < 20; k++) {
      const cands = techConfig.filter((t) => !researchBlock(p, t));
      if (!cands.length) break;
      p = research(p, cands[0].id).profile;
    }
    for (const slot of SLOT_IDS) {
      const id = p.equipment[slot];
      if (!id) continue;
      const it = p.items[id];
      if (it.level < 5 && !upgradeBlock(p, it, false)) p = tryUpgrade(p, id, false).profile;
      else if (!upgradeBlock(p, it, true)) p = tryUpgrade(p, id, true).profile;
    }
    p = ensureMinimumKit(p).profile;
    const spare = Object.values(p.items).filter((i) => !isEquipped(p, i.id) && i.rarity !== 'unique');
    if (spare.length > 40)
      for (const it of spare.sort((a, b) => scoreItem(a) - scoreItem(b)).slice(0, spare.length - 30)) p = sellItem(p, it.id).profile;
  };

  let total = 0;
  let deaths = 0;
  let bossDeaths = 0;
  let lastReport = -1e9;
  while (total < HOURS * 3600) {
    const loc = getLocation(p.locations.current);
    const eng = new GameEngine(loc, () => computeBunkerStats(p), () => ({ decay: rewardDecay(p.bunker.level, loc) }));
    eng.setViewport(220, 340);
    let bossDone = false;
    let bossFailed = false;
    eng.on((ev) => {
      if (ev.type === 'kill') {
        p = addResources(p, ev.loot.resources);
        p = addItems(p, ev.loot.items).profile;
        p = addXp(p, ev.xp).profile;
      }
      if (ev.type === 'groupCleared') p = addGroupKill(p, loc.id);
      if (ev.type === 'bossKilled') {
        const loot = rollBossLoot(ev.bossId, { location: loc, decay: 1, dropChanceMult: 1, coinMult: 1 });
        p = addResources(p, loot.resources);
        p = addItems(p, loot.items).profile;
        const r = registerBossKill(p, loc.id);
        p = r.profile;
        if (r.unlocked) p = setCurrentLocation(p, r.unlocked);
        bossDone = true;
      }
      if (ev.type === 'defeat') {
        if (ev.duringBoss) {
          bossFailed = true;
          bossDeaths++;
        } else deaths++;
      }
    });
    let t = 0;
    let summoned = false;
    let nextManage = 30;
    while (eng.state === 'running' && !bossDone && t < 900) {
      eng.update(1 / 30);
      t += 1 / 30;
      if (t >= nextManage) {
        nextManage += 30;
        spendAll();
        bestLayout();
        eng.refreshStats();
      }
      const ready = computeBunkerStats(p).sustainedDps * 100 > bossesConfig[loc.boss].hp * 1.4;
      if (!summoned && ready && eng.mode === 'normal' && canSummonBoss(p, loc.id) && t > 20) {
        p = consumeSummon(p, loc.id, false)!;
        eng.summonBoss();
        summoned = true;
      }
    }
    if (bossFailed) for (let i = 0; i < loc.groupsForBoss; i++) p = addGroupKill(p, loc.id);
    total += t;
    spendAll();
    bestLayout();
    if (total - lastReport >= 900 || bossDone) {
      lastReport = total;
      const s = computeBunkerStats(p);
      console.log(
        `  ${String(Math.round(total / 60)).padStart(3)} мин | лок. ${p.locations.current} | ур. ${p.bunker.level} | боссов ${p.stats.bossesKilled} | ` +
          `DPS ${Math.round(s.sustainedDps)} | HP ${s.maxHp} | энергия ×${s.energyFactor.toFixed(2)} | тепло ×${s.heatFactor.toFixed(2)} | ` +
          `тех ${Object.values(p.techs).reduce((a, b) => a + b, 0)} | смертей ${deaths}/${bossDeaths}${bossDone ? ' ← босс' : ''}${bossFailed ? ' (босс не побеждён)' : ''}`,
      );
    }
  }
}

if (failures > 0) {
  console.log(`\n${failures} проверок не пройдено`);
  process.exit(1);
}
console.log('\nВсе проверки пройдены');
