import { claimVipChest, claimVipGift } from '../src/game/meta/vipActions';
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
  sellMany,
  setCurrentLocation,
  unequipItem,
} from '../src/game/profile/Profile';
import { effectValue, resetSkills, research, researchBlock, researchCost } from '../src/game/progression/TechnologyTree';
import { LOGIN_DAYS, buyOffer, buySpecial, claimDaily, claimQuest, claimQuestBonus, doExchange, ensureQuests, ensureShop, exchangeUsed, questProgress, refreshShop } from '../src/game/meta/Meta';
import { addParts, extractPart, fuseAll, fuseParts, fusionPick, generatePart, partQuality, installPart, unlockSlot } from '../src/game/items/Parts';
import { applyAutoSell } from '../src/game/economy/AutoSell';
import { computeOfflineReward } from '../src/game/progression/offline';
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

console.log('— Модификации');
{
  let p = createNewProfile();
  const coil = generateItem({ templateId: 'coil_emp', rarity: 'legendary', tier: 1, source: { kind: 'start' } });
  coil.slots = [{ locked: false, partId: null }, { locked: true, partId: null }];
  p = addItems(p, [coil]).profile;
  p = equipItem(p, coil.id, 'coil1').profile;
  const part = generatePart('rare', 'p_power');
  p = addParts(p, [part]);
  const before = computeBunkerStats(p).coils[0].power;
  check('Модификация не ставится в неподходящий тип', installPart(addParts(p, [generatePart('common', 'p_plate')]), Object.keys(addParts(p, [])).length ? part.id : part.id, p.equipment.generator!, 0).error !== undefined);
  check('Нельзя вставить в заблокированный слот', installPart(p, part.id, coil.id, 1).error === 'locked');
  const ins = installPart(p, part.id, coil.id, 0);
  check('Модификация устанавливается в свободный слот', !ins.error);
  check('Модификация влияет на характеристики', computeBunkerStats(ins.profile).coils[0].power > before);
  check('Без ключа слот не открыть', unlockSlot(ins.profile, coil.id, 1) === null);
  const withKey = addResources(ins.profile, { expansionKeys: 1 });
  check('Ключ открывает слот', unlockSlot(withKey, coil.id, 1)?.items[coil.id].slots[1].locked === false);
  const sold = sellItem(unequipItem(ins.profile, coil.id), coil.id);
  check('Детали теряются вместе с оборудованием', !sold.profile.parts[part.id]);
  let q = createNewProfile();
  q = addParts(q, [generatePart('common', 'p_lens'), generatePart('common', 'p_lens'), generatePart('common', 'p_lens')]);
  let ok = 0;
  let fails = 0;
  for (let i = 0; i < 200; i++) {
    const r = fuseParts(q, Object.keys(q.parts)[0]);
    if (r.success) ok++;
    else fails++;
    const left = Object.keys(r.profile.parts).length;
    if (r.success && !(left === 1 && r.result?.rarity === 'uncommon')) ok = -999;
    if (!r.success && left !== 0) fails = -999;
  }
  check(`Объединение 3 → 1 следующей редкости (успех ${ok}/200)`, ok > 170 && fails >= 0);
  let ex = addResources(ins.profile, { energyCores: 10 });
  const exr = extractPart(ex, coil.id, 0);
  check('Модификация извлекается за энергоядра', !exr.error && exr.profile.parts[part.id].installedIn === null && exr.profile.items[coil.id].slots[0].partId === null && exr.profile.resources.energyCores < 10);
  check('Без энергоядер извлечь нельзя', extractPart(ins.profile, coil.id, 0).error === 'resources');
  ex = addParts(createNewProfile(), Array.from({ length: 9 }, () => generatePart('common', 'p_power')));
  const fa = fuseAll(ex, 'common');
  check(`Массовое объединение (${fa.success} успех, ${fa.failed} неудач)`, fa.success + fa.failed === 3);
  check('Нельзя объединить меньше трёх', fuseParts(addParts(createNewProfile(), [generatePart('common', 'p_lens')]), Object.keys(addParts(createNewProfile(), [])).length ? '' : '').error === 'count');
}

console.log('— Автопродажа и офлайн');
{
  let p = { ...createNewProfile(), autoSell: { maxRarity: 'uncommon' as const } };
  const junk = generateItem({ templateId: 'gen_diesel', rarity: 'common', tier: 1, source: { kind: 'start' } });
  junk.baseStats = [{ stat: 'genPower', value: 3 }];
  const rare = generateItem({ templateId: 'gen_diesel', rarity: 'rare', tier: 1, source: { kind: 'start' } });
  const free = generateItem({ templateId: 'sh_armor', rarity: 'common', tier: 1, source: { kind: 'start' } });
  const r = applyAutoSell(p, [junk, rare, free]);
  check('Слабое обычное продаётся автоматически', r.sold.some((x) => x.id === junk.id) && r.coins > 0);
  check('Редкость выше порога не продаётся', r.keep.some((x) => x.id === rare.id));
  check('Предмет для пустого слота не продаётся', r.keep.some((x) => x.id === free.id));
  p = { ...p, offline: { lastSeen: Date.now() - 2 * 3600 * 1000, rates: { location: 1, resources: { coins: 2, scrap: 0.5 }, xp: 1, kills: 0.5, groups: 0.1, items: 0.01, parts: 0.002 } } };
  const off = computeOfflineReward(p)!;
  check(`Офлайн-награда за 2 часа (${off.resources.coins} монет, ${off.items.length} предметов)`, !!off && off.resources.coins! > 6000 && off.items.length > 10);
  const capped = computeOfflineReward({ ...p, offline: { ...p.offline, lastSeen: Date.now() - 100 * 3600 * 1000 } })!;
  check('Офлайн ограничен 8 часами', Math.round(capped.seconds) === 8 * 3600);
  check('Короткое отсутствие не даёт награды', computeOfflineReward({ ...p, offline: { ...p.offline, lastSeen: Date.now() - 10_000 } }) === null);
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

console.log('— Модификации по редкости и объединение');
{
  check('Обычная модификация — 1 свойство, легендарная — 5', generatePart('common', 'p_power').stats.length === 1 && generatePart('legendary', 'p_power').stats.length === 5);
  let p = createNewProfile();
  const a = [0, 1, 2].map(() => generatePart('rare', 'p_plate'));
  const b = [0, 1, 2].map(() => generatePart('rare', 'p_plate'));
  p = addParts(p, [...a, ...b]);
  const pick = fusionPick(p, b[0]);
  check('Объединение берёт выбранную и две самые слабые', pick.length === 3 && pick[0].id === b[0].id);
  const r = fuseParts(p, b[0].id);
  check('После объединения остаются ровно 3 из 6 исходных', Object.values(r.profile.parts).filter((x) => x.rarity === 'rare').length === 3);
  {
    let p2 = createNewProfile();
    const pool = [0, 1, 2, 3].map(() => generatePart('epic', 'p_power'));
    p2 = addParts(p2, pool);
    const keep = pool[0];
    const pickIds = [pool[1].id, pool[2].id, pool[3].id];
    const rr = fuseParts(p2, pool[1].id, pickIds);
    check('Ручной выбор: в объединение уходят только выбранные', !!rr.profile.parts[keep.id] && pickIds.every((id) => !rr.profile.parts[id]));
    check('Нельзя смешать разные модификации', fuseParts(addParts(p2, [generatePart('epic', 'p_lens')]), pool[1].id, [pool[1].id, pool[2].id, Object.values(addParts(p2, [generatePart('epic', 'p_lens')]).parts).find((x) => x.templateId === 'p_lens')!.id]).error !== undefined);
  }
  const q = partQuality(a[0]);
  check('Качество модификации в пределах 0..100%', q >= 0 && q <= 1);
}

console.log('— VIP');
{
  let p = createNewProfile();
  p = { ...p, vip: { points: 100000, chestDay: '', gifts: [] } };
  const c = claimVipChest(p);
  check('VIP-сундук открывается раз в день', !!c && !claimVipChest(c!));
  const g = claimVipGift(p, 10);
  check('Подарок VIP 10 — эксклюзивная «Корона»', !!g && g.items.some((i) => i.templateId === 'v_crown') && !claimVipGift(g.profile, 10));
  const g8 = claimVipGift(p, 8);
  check('Подарок VIP 8 — «Империал»', !!g8 && g8.items.some((i) => i.templateId === 'v_imperial'));
  check('VIP даёт бонус к монетам в характеристиках', computeBunkerStats(p).coinMult > computeBunkerStats(createNewProfile()).coinMult);
}

console.log('— Бесконечные навыки');
{
  let p = addResources(addXp(createNewProfile(), 1e9).profile, { coins: 1e15, techParts: 1e15, scrap: 1e15, blueprints: 1e15, energyCores: 1e15 });
  {
    let q = { ...p, bunker: { ...p.bunker, level: 30 } };
    for (let i = 0; i < 60; i++) for (const t of techConfig) q = research(q, t.id).profile;
    const spent = Object.values(q.techs).reduce((a, b) => a + b, 0);
    check(`Уровень 30 = 30 очков навыков (вложено ${spent})`, spent === 30 && research(q, 'm_power').error === 'points');
    const r = resetSkills(q);
    check('Сброс навыков возвращает очки и ресурсы', Object.keys(r.techs).length === 0 && r.resources.coins > q.resources.coins);
  }
  p = { ...p, bunker: { ...p.bunker, level: 100000 } };
  for (let i = 0; i < 60; i++) for (const t of techConfig) p = research(p, t.id).profile;
  check('Навык качается выше старого предела (60 уровней)', (p.techs['m_power'] ?? 0) === 60);
  const st = computeBunkerStats(p);
  const drNode = techConfig.find((t) => t.id === 'd_dr')!;
  check('Ограниченный эффект навыка приближается к пределу', effectValue(drNode.effects[0], 1000) <= 0.35 + 1e-9 && effectValue(drNode.effects[0], 1000) > 0.34);
  check(`Общий предел снижения урона (${(st.damageReduction * 100).toFixed(0)}%)`, st.damageReduction <= 0.6);
  const node = techConfig.find((t) => t.id === 'm_power')!;
  check('Стоимость растёт геометрически', (researchCost(node, 20).coins ?? 0) > (researchCost(node, 10).coins ?? 0) * 10);
}

console.log('— Магазин, обмен, награды, задания');
{
  let p = ensureQuests(ensureShop(addResources(createNewProfile(), { coins: 1e6, scrap: 1000, techParts: 1000, blueprints: 100, crystals: 500 })));
  check('Магазин заполнен', p.shop.regular.length === 7 && p.shop.rare.length === 4);
  const offer = p.shop.regular.find((o) => o.item)!;
  const before = Object.keys(p.items).length;
  const b = buyOffer(p, 'regular', offer.id);
  check('Покупка списывает монеты и добавляет предмет', !b.error && Object.keys(b.profile.items).length === before + 1 && b.profile.resources.coins < p.resources.coins);
  check('Нельзя купить дважды', buyOffer(b.profile, 'regular', offer.id).error === 'sold');
  const r1 = refreshShop(p)!;
  check('Ручное обновление стоит монет и меняет ассортимент', r1.resources.coins < p.resources.coins && r1.shop.regular[0].id !== p.shop.regular[0].id);
  check('Спецмагазин за кристаллы', buySpecial(p, 'sp_pass').profile.resources.bossPasses === 1);
  let q = p;
  for (let i = 0; i < 30; i++) q = doExchange(q, 'scrap_coins').profile;
  check('Дневной лимит обмена', exchangeUsed(q, 'scrap_coins') === 20 && doExchange(q, 'scrap_coins').error === 'limit');
  // Обмен по кругу не даёт прибыли
  let loop = addResources(createNewProfile(), { coins: 3000 });
  const c0 = loop.resources.coins;
  loop = doExchange(loop, 'coins_tech').profile;
  for (let i = 0; i < 2; i++) loop = doExchange(loop, 'tech_scrap').profile;
  while (loop.resources.scrap >= 20) loop = doExchange(loop, 'scrap_coins').profile;
  check(`Обмен по кругу в убыток (${c0} → ${loop.resources.coins})`, loop.resources.coins < c0);
  const d1 = claimDaily(p);
  check('Награда за вход выдаётся', !!d1.reward && d1.profile.resources.coins > p.resources.coins);
  check('Календарь входа — 30 дней', LOGIN_DAYS === 30);
  check('Повторно в тот же день нельзя', !claimDaily(d1.profile).reward);
  check('Есть задания на день, неделю и месяц', p.quests.day.list.length === 4 && p.quests.week.list.length === 5 && p.quests.month.list.length === 5);
  for (const per of ['day', 'week', 'month'] as const) {
    let qq = p;
    for (const k of qq.quests[per].list.map((x) => x.kind)) qq = questProgress(qq, k, 1e6);
    for (const x of qq.quests[per].list) qq = claimQuest(qq, x.id) ?? qq;
    check(`Задания (${per}) выполняются и награда выдаётся`, qq.quests[per].list.every((x) => x.claimed));
    const b = claimQuestBonus(qq, per);
    check(`Сундук за все задания (${per})`, !!b && !claimQuestBonus(b, per));
    if (per === 'day' && b) {
      const da = b.quests.week.list.find((x) => x.kind === 'dailyAll');
      check('Выполненный день идёт в задание «все ежедневные»', !da || da.progress === 1);
    }
  }
  const eqId = p.equipment.coil1!;
  const ms = sellMany(p, [eqId, offer.id]);
  check('Массовая продажа пропускает установленное', !!ms.profile.items[eqId]);
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
  check(`Роботы появляются непрерывно, группы уничтожаются (${groups} за 2 мин)`, groups >= 5);
  check('Выйти из боя без босса нельзя', !e2.retreatFromBoss());
  e2.summonBoss();
  check('Из боя с боссом можно выйти, бой продолжается', e2.retreatFromBoss() && e2.mode === 'normal' && e2.state === 'running' && !e2.boss);

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
  check('Миграция v2 → v5: модификации и автопродажа', !!m.parts && m.autoSell.maxRarity === null && m.resources.expansionKeys === 0);
  check('Миграция v5: магазин, обмен, награды, задания', !!m.shop && !!m.exchange && !!m.daily && !!m.quests && m.version === 7);
  check('Миграция v6: профиль игрока и VIP', m.player.frame === 'steel' && m.vip.points === 0);
  check('Миграция v7: задания по периодам', !!m.quests.day && !!m.quests.week && !!m.quests.month);
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
