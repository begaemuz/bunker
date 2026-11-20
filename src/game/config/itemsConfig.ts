import type { CoilMode, EquipCategory, StatKey, UniqueEffect } from '../types';

/** Диапазон характеристики для обычной редкости и 1-го технологического уровня. */
export interface StatRange {
  stat: StatKey;
  min: number;
  max: number;
}

export interface CoilRange {
  mode: CoilMode;
  power: [number, number];
  radius: [number, number];
  interval: [number, number];
  energy: [number, number];
  heat: [number, number];
}

export interface ItemTemplate {
  id: string;
  name: string;
  category: EquipCategory;
  description: string;
  base: StatRange[];
  coil?: CoilRange;
  /** Постоянное потребление энергии, ед/с. */
  energyCost: [number, number];
  /** Вес при случайном выпадении (0 — не выпадает случайно). */
  weight: number;
  /** Для уникальных предметов: особое свойство. */
  unique?: UniqueEffect;
}

const T = (t: Omit<ItemTemplate, 'energyCost' | 'weight'> & Partial<Pick<ItemTemplate, 'energyCost' | 'weight'>>): ItemTemplate => ({
  energyCost: [0, 0],
  weight: 10,
  ...t,
});

export const itemTemplates: ItemTemplate[] = [
  // ───────── Генераторы ─────────
  T({
    id: 'gen_diesel',
    name: 'Дизельный генератор',
    category: 'generator',
    description: 'Надёжный источник энергии из запасов старого мира. Стабилен и почти не греется.',
    base: [{ stat: 'genPower', min: 12, max: 15 }],
  }),
  T({
    id: 'gen_turbine',
    name: 'Газотурбинная установка',
    category: 'generator',
    description: 'Больше мощности, но заметный нагрев всего комплекса.',
    base: [
      { stat: 'genPower', min: 17, max: 21 },
      { stat: 'heatPct', min: 0.12, max: 0.16 },
    ],
    weight: 7,
  }),
  T({
    id: 'gen_reactor',
    name: 'Компактный реактор',
    category: 'generator',
    description: 'Реакторный генератор: огромная мощность и встроенный накопитель, но сильный нагрев.',
    base: [
      { stat: 'genPower', min: 22, max: 27 },
      { stat: 'capacity', min: 10, max: 18 },
      { stat: 'heatPct', min: 0.22, max: 0.28 },
    ],
    weight: 4,
  }),
  T({
    id: 'gen_thermo',
    name: 'Термоэлектрический генератор',
    category: 'generator',
    description: 'Превращает часть тепла оборудования в энергию и тем самым охлаждает комплекс.',
    base: [
      { stat: 'genPower', min: 9, max: 12 },
      { stat: 'coolRate', min: 1.5, max: 2.5 },
    ],
    weight: 6,
  }),

  // ───────── Катушки ─────────
  T({
    id: 'coil_emp',
    name: 'Катушка ЭМИ',
    category: 'coil',
    description: 'Импульс по площади, сбивает электронику роботов.',
    base: [],
    coil: { mode: 'emp', power: [28, 33], radius: [135, 150], interval: [0.95, 1.1], energy: [5, 6], heat: [5, 6] },
  }),
  T({
    id: 'coil_hv',
    name: 'Высоковольтный разрядник',
    category: 'coil',
    description: 'Редкий, но очень мощный разряд в самую прочную цель.',
    base: [],
    coil: { mode: 'highVoltage', power: [95, 115], radius: [160, 180], interval: [1.8, 2.2], energy: [12, 14], heat: [10, 12] },
    weight: 7,
  }),
  T({
    id: 'coil_radio',
    name: 'Радиочастотный излучатель',
    category: 'coil',
    description: 'Слабый урон, большой радиус. Глушит связь машин и выключает поддержку.',
    base: [],
    coil: { mode: 'radio', power: [11, 14], radius: [170, 190], interval: [0.8, 1], energy: [3, 4], heat: [2, 3] },
    weight: 6,
  }),
  T({
    id: 'coil_overload',
    name: 'Катушка перегрузки',
    category: 'coil',
    description: 'Специализирована против энергощитов: снимает их и мешает восстановлению.',
    base: [],
    coil: { mode: 'overload', power: [25, 30], radius: [130, 145], interval: [1.1, 1.3], energy: [6, 7], heat: [6, 7] },
    weight: 6,
  }),
  T({
    id: 'coil_thermal',
    name: 'Термоиндуктор',
    category: 'coil',
    description: 'Нагревает узлы роботов сквозь броню. Сам сильно греется.',
    base: [],
    coil: { mode: 'thermal', power: [20, 24], radius: [120, 135], interval: [1, 1.2], energy: [6, 7], heat: [9, 10] },
    weight: 6,
  }),
  T({
    id: 'coil_vibro',
    name: 'Вибрационный излучатель',
    category: 'coil',
    description: 'Низкочастотная волна ломает ходовую часть тяжёлых машин и замедляет их.',
    base: [],
    coil: { mode: 'vibration', power: [22, 27], radius: [140, 155], interval: [1.1, 1.3], energy: [5, 6], heat: [4, 5] },
    weight: 6,
  }),

  // ───────── Конденсаторы ─────────
  T({
    id: 'cap_bank',
    name: 'Конденсаторный блок',
    category: 'capacitor',
    description: 'Сбалансированный накопитель: запас, скорость зарядки и усиление разряда.',
    base: [
      { stat: 'capacity', min: 40, max: 55 },
      { stat: 'chargeRate', min: 12, max: 16 },
      { stat: 'dischargeBonus', min: 0.1, max: 0.15 },
    ],
  }),
  T({
    id: 'cap_super',
    name: 'Суперконденсатор',
    category: 'capacitor',
    description: 'Огромный запас энергии, но медленная зарядка.',
    base: [
      { stat: 'capacity', min: 85, max: 110 },
      { stat: 'chargeRate', min: 9, max: 12 },
      { stat: 'dischargeBonus', min: 0.05, max: 0.08 },
    ],
    weight: 6,
  }),
  T({
    id: 'cap_pulse',
    name: 'Импульсный накопитель',
    category: 'capacitor',
    description: 'Быстро заряжается и сильно усиливает импульс, когда заряжен.',
    base: [
      { stat: 'capacity', min: 30, max: 40 },
      { stat: 'chargeRate', min: 18, max: 24 },
      { stat: 'dischargeBonus', min: 0.2, max: 0.28 },
    ],
    weight: 6,
  }),

  // ───────── Преобразователи ─────────
  T({
    id: 'conv_basic',
    name: 'Трансформаторный узел',
    category: 'converter',
    description: 'Снижает потери при передаче энергии от генератора к системам.',
    base: [{ stat: 'conversion', min: 0.82, max: 0.86 }],
  }),
  T({
    id: 'conv_smart',
    name: 'Интеллектуальный распределитель',
    category: 'converter',
    description: 'Немного хуже КПД, зато повышает эффективность охлаждения, сенсоров и защиты.',
    base: [
      { stat: 'conversion', min: 0.78, max: 0.82 },
      { stat: 'moduleBonus', min: 0.06, max: 0.1 },
    ],
    weight: 6,
  }),
  T({
    id: 'conv_inverter',
    name: 'Высоковольтный инвертор',
    category: 'converter',
    description: 'Снижает стоимость каждого импульса катушек.',
    base: [
      { stat: 'conversion', min: 0.8, max: 0.84 },
      { stat: 'pulseCostPct', min: -0.08, max: -0.12 },
    ],
    weight: 6,
  }),

  // ───────── Охлаждение ─────────
  T({
    id: 'cool_air',
    name: 'Воздушное охлаждение',
    category: 'cooling',
    description: 'Простая и экономичная система отвода тепла.',
    base: [
      { stat: 'coolRate', min: 6, max: 8 },
      { stat: 'heatCap', min: 30, max: 40 },
    ],
    energyCost: [1, 1.2],
  }),
  T({
    id: 'cool_liquid',
    name: 'Жидкостный контур',
    category: 'cooling',
    description: 'Быстро отводит тепло, но потребляет больше энергии.',
    base: [
      { stat: 'coolRate', min: 10, max: 13 },
      { stat: 'heatCap', min: 20, max: 30 },
    ],
    energyCost: [2, 2.5],
    weight: 7,
  }),
  T({
    id: 'cool_cryo',
    name: 'Криогенный теплообменник',
    category: 'cooling',
    description: 'Большой тепловой запас и форсаж катушек, пока комплекс холодный.',
    base: [
      { stat: 'coolRate', min: 7, max: 9 },
      { stat: 'heatCap', min: 50, max: 70 },
      { stat: 'overdrive', min: 0.08, max: 0.12 },
    ],
    energyCost: [2.5, 3],
    weight: 5,
  }),

  // ───────── Сенсоры ─────────
  T({
    id: 'sens_radar',
    name: 'Радарный комплекс',
    category: 'sensor',
    description: 'Дальнее обнаружение: цели опознаются ещё на подходе.',
    base: [
      { stat: 'detectRange', min: 230, max: 270 },
      { stat: 'identifiedBonus', min: 0.1, max: 0.14 },
    ],
    energyCost: [1.5, 2],
  }),
  T({
    id: 'sens_thermal',
    name: 'Тепловизорный массив',
    category: 'sensor',
    description: 'Быстро опознаёт цели и находит уязвимые узлы для критических импульсов.',
    base: [
      { stat: 'detectRange', min: 180, max: 210 },
      { stat: 'identifySpeed', min: 0.3, max: 0.4 },
      { stat: 'critChance', min: 0.06, max: 0.09 },
    ],
    energyCost: [1.5, 2],
    weight: 7,
  }),
  T({
    id: 'sens_analyzer',
    name: 'Анализатор сигнатур',
    category: 'sensor',
    description: 'Глубокий анализ опознанных машин: большой бонус урона и силы критов.',
    base: [
      { stat: 'detectRange', min: 170, max: 200 },
      { stat: 'identifiedBonus', min: 0.16, max: 0.22 },
      { stat: 'critDamage', min: 0.2, max: 0.3 },
    ],
    energyCost: [2, 2.5],
    weight: 5,
  }),

  // ───────── Защитный контур ─────────
  T({
    id: 'sh_armor',
    name: 'Бронированный контур',
    category: 'shield',
    description: 'Дополнительные бронеплиты: прочность и снижение урона.',
    base: [
      { stat: 'hullHp', min: 250, max: 350 },
      { stat: 'damageReduction', min: 0.04, max: 0.06 },
    ],
    energyCost: [1, 1.5],
  }),
  T({
    id: 'sh_field',
    name: 'Энергетический барьер',
    category: 'shield',
    description: 'Поле снижает весь входящий урон, особенно энергетический.',
    base: [
      { stat: 'damageReduction', min: 0.08, max: 0.12 },
      { stat: 'resist:energy', min: 0.1, max: 0.15 },
    ],
    energyCost: [2.5, 3],
    weight: 7,
  }),
  T({
    id: 'sh_repair',
    name: 'Аварийный ремонтный контур',
    category: 'shield',
    description: 'Постоянный ремонт и экстренное восстановление при критических повреждениях.',
    base: [
      { stat: 'regen', min: 1.5, max: 2.5 },
      { stat: 'emergencyRepair', min: 0.15, max: 0.2 },
    ],
    energyCost: [1.5, 2],
    weight: 6,
  }),

  // ───────── Уникальные (только с боссов) ─────────
  T({
    id: 'u_silencer',
    name: 'Катушка «Глушитель»',
    category: 'coil',
    description: 'Трофей Колосса. Дополнительно повреждает электронные системы роботов.',
    base: [],
    coil: { mode: 'emp', power: [24, 26], radius: [150, 160], interval: [0.9, 0.95], energy: [5, 5.5], heat: [5, 5.5] },
    unique: { kind: 'electronics', value: 0.4 },
    weight: 0,
  }),
  T({
    id: 'u_firststrike',
    name: 'Конденсатор «Первый удар»',
    category: 'capacitor',
    description: 'Трофей Колосса. Первый импульс после паузы вдвое мощнее.',
    base: [
      { stat: 'capacity', min: 50, max: 55 },
      { stat: 'chargeRate', min: 15, max: 16 },
      { stat: 'dischargeBonus', min: 0.12, max: 0.14 },
    ],
    unique: { kind: 'firstPulse', value: 1 },
    weight: 0,
  }),
  T({
    id: 'u_twins',
    name: 'Генератор «Близнецы»',
    category: 'generator',
    description: 'Трофей Кузнеца. Синхронизирует обе катушки и повышает их мощность.',
    base: [{ stat: 'genPower', min: 15, max: 16 }],
    unique: { kind: 'dualCoil', value: 0.2 },
    weight: 0,
  }),
  T({
    id: 'u_reflector',
    name: 'Контур «Отражатель»',
    category: 'shield',
    description: 'Трофей Кузнеца. Возвращает часть урона атакующим роботам.',
    base: [
      { stat: 'hullHp', min: 250, max: 280 },
      { stat: 'damageReduction', min: 0.05, max: 0.06 },
    ],
    energyCost: [1.5, 1.5],
    unique: { kind: 'reflect', value: 0.35 },
    weight: 0,
  }),
  T({
    id: 'u_dune',
    name: 'Охладитель «Бархан»',
    category: 'cooling',
    description: 'Трофей Песчаного червя. Каждое уничтожение робота сбрасывает тепло.',
    base: [
      { stat: 'coolRate', min: 8, max: 9 },
      { stat: 'heatCap', min: 35, max: 40 },
    ],
    energyCost: [1.2, 1.2],
    unique: { kind: 'coolOnKill', value: 4 },
    weight: 0,
  }),
  T({
    id: 'u_scorch',
    name: 'Термоиндуктор «Зной»',
    category: 'coil',
    description: 'Трофей Песчаного червя. Прожигающий импульс с повышенной мощностью по экранированным целям.',
    base: [],
    coil: { mode: 'thermal', power: [19, 21], radius: [135, 140], interval: [0.95, 1], energy: [6, 6.5], heat: [8, 8.5] },
    unique: { kind: 'shieldStrip', value: 0.15 },
    weight: 0,
  }),
  T({
    id: 'u_recuperator',
    name: 'Преобразователь «Рекуператор»',
    category: 'converter',
    description: 'Трофей Ледокола. Возвращает энергию в накопитель при уничтожении роботов.',
    base: [{ stat: 'conversion', min: 0.86, max: 0.87 }],
    unique: { kind: 'killEnergy', value: 3 },
    weight: 0,
  }),
  T({
    id: 'u_quake',
    name: 'Излучатель «Сейсмо»',
    category: 'coil',
    description: 'Трофей Ледокола. Вибрация, которая ломает щиты вместе с шасси.',
    base: [],
    coil: { mode: 'vibration', power: [21, 23], radius: [150, 160], interval: [1.05, 1.1], energy: [5.5, 6], heat: [4.5, 5] },
    unique: { kind: 'shieldStrip', value: 0.12 },
    weight: 0,
  }),
  T({
    id: 'u_marker',
    name: 'Сенсор «Метка»',
    category: 'sensor',
    description: 'Трофей Изотопа. Опознанные цели получают повышенный урон от всех систем.',
    base: [
      { stat: 'detectRange', min: 240, max: 250 },
      { stat: 'identifiedBonus', min: 0.12, max: 0.13 },
    ],
    energyCost: [2, 2],
    unique: { kind: 'markTargets', value: 0.25 },
    weight: 0,
  }),
  T({
    id: 'u_breaker',
    name: 'Катушка «Взломщик»',
    category: 'coil',
    description: 'Трофей Изотопа. Перегрузка, временно отключающая защиту противника.',
    base: [],
    coil: { mode: 'overload', power: [23, 25], radius: [140, 150], interval: [1, 1.05], energy: [6, 6.5], heat: [6, 6.5] },
    unique: { kind: 'shieldStrip', value: 0.3 },
    weight: 0,
  }),
  T({
    id: 'u_lightning',
    name: 'Разрядник «Молния»',
    category: 'coil',
    description: 'Трофей Прототипа-Х. Разряд дополнительно выжигает электронику.',
    base: [],
    coil: { mode: 'highVoltage', power: [90, 95], radius: [175, 185], interval: [1.7, 1.75], energy: [12, 13], heat: [10, 11] },
    unique: { kind: 'electronics', value: 0.35 },
    weight: 0,
  }),
  T({
    id: 'u_prototype_cap',
    name: 'Накопитель «Прототип»',
    category: 'capacitor',
    description: 'Трофей Прототипа-Х. Огромный первый разряд после паузы.',
    base: [
      { stat: 'capacity', min: 90, max: 100 },
      { stat: 'chargeRate', min: 18, max: 20 },
      { stat: 'dischargeBonus', min: 0.2, max: 0.22 },
    ],
    unique: { kind: 'firstPulse', value: 1.5 },
    weight: 0,
  }),
  T({
    id: 'u_core_gen',
    name: 'Ядро «Сингулярность»',
    category: 'generator',
    description: 'Трофей Ядра ИИ. Колоссальная мощность и синхронизация двух катушек.',
    base: [
      { stat: 'genPower', min: 30, max: 32 },
      { stat: 'heatPct', min: 0.1, max: 0.1 },
    ],
    unique: { kind: 'dualCoil', value: 0.3 },
    weight: 0,
  }),
  T({
    id: 'u_core_sensor',
    name: 'Сенсор «Всевидящий»',
    category: 'sensor',
    description: 'Трофей Ядра ИИ. Метит цели для всех систем комплекса.',
    base: [
      { stat: 'detectRange', min: 280, max: 290 },
      { stat: 'identifySpeed', min: 0.5, max: 0.5 },
      { stat: 'critChance', min: 0.1, max: 0.1 },
    ],
    energyCost: [2.5, 2.5],
    unique: { kind: 'markTargets', value: 0.35 },
    weight: 0,
  }),

  // ───────── Эксклюзивы VIP (не выпадают, только подарок) ─────────
  T({
    id: 'v_imperial',
    name: 'Генератор «Империал»',
    category: 'generator',
    description: 'Эксклюзив VIP 8. Огромная мощность и синхронизация обеих катушек.',
    base: [
      { stat: 'genPower', min: 32, max: 36 },
      { stat: 'conversion', min: 0.86, max: 0.9 },
    ],
    unique: { kind: 'dualCoil', value: 0.35 },
    weight: 0,
  }),
  T({
    id: 'v_crown',
    name: 'Катушка «Корона»',
    category: 'coil',
    description: 'Эксклюзив VIP 10. Перегрузочный разряд по площади, выжигающий электронику роботов.',
    base: [],
    coil: { mode: 'overload', power: [34, 38], radius: [170, 180], interval: [0.85, 0.9], energy: [6, 6.5], heat: [5.5, 6] },
    unique: { kind: 'electronics', value: 0.6 },
    weight: 0,
  }),
];

/** Пулы дополнительных свойств по типам оборудования. */
export const extraStatPools: Record<EquipCategory, StatRange[]> = {
  generator: [
    { stat: 'genPowerPct', min: 0.04, max: 0.08 },
    { stat: 'heatPct', min: -0.05, max: -0.1 },
    { stat: 'capacity', min: 8, max: 15 },
    { stat: 'xpPct', min: 0.04, max: 0.08 },
  ],
  coil: [
    { stat: 'coilPowerPct', min: 0.05, max: 0.1 },
    { stat: 'coilRadiusPct', min: 0.03, max: 0.06 },
    { stat: 'coilRatePct', min: 0.04, max: 0.08 },
    { stat: 'pulseCostPct', min: -0.05, max: -0.1 },
    { stat: 'chance:armorBreak', min: 0.06, max: 0.12 },
    { stat: 'chance:chain', min: 0.04, max: 0.08 },
  ],
  capacitor: [
    { stat: 'chargeRate', min: 3, max: 5 },
    { stat: 'capacityPct', min: 0.08, max: 0.15 },
    { stat: 'dischargeBonus', min: 0.04, max: 0.08 },
    { stat: 'coilRatePct', min: 0.03, max: 0.05 },
  ],
  converter: [
    { stat: 'drainPct', min: -0.08, max: -0.15 },
    { stat: 'moduleBonus', min: 0.03, max: 0.06 },
    { stat: 'genPowerPct', min: 0.03, max: 0.06 },
    { stat: 'pulseCostPct', min: -0.04, max: -0.07 },
  ],
  cooling: [
    { stat: 'coolRatePct', min: 0.08, max: 0.14 },
    { stat: 'heatCap', min: 10, max: 20 },
    { stat: 'overdrive', min: 0.04, max: 0.07 },
    { stat: 'heatPct', min: -0.05, max: -0.1 },
  ],
  sensor: [
    { stat: 'detectRange', min: 20, max: 40 },
    { stat: 'identifySpeed', min: 0.1, max: 0.2 },
    { stat: 'identifiedBonus', min: 0.05, max: 0.09 },
    { stat: 'critChance', min: 0.03, max: 0.05 },
    { stat: 'dropChancePct', min: 0.05, max: 0.1 },
    { stat: 'coinPct', min: 0.05, max: 0.1 },
  ],
  shield: [
    { stat: 'hullHp', min: 80, max: 150 },
    { stat: 'hullPct', min: 0.05, max: 0.1 },
    { stat: 'regen', min: 0.5, max: 1 },
    { stat: 'resist:kinetic', min: 0.05, max: 0.1 },
    { stat: 'resist:explosive', min: 0.06, max: 0.12 },
    { stat: 'resist:energy', min: 0.05, max: 0.1 },
    { stat: 'damageReduction', min: 0.02, max: 0.04 },
  ],
};

/** Стартовый комплект новой игры (обычная редкость). */
export const starterKit: { slot: 'generator' | 'coil1' | 'capacitor' | 'cooling'; template: string }[] = [
  { slot: 'generator', template: 'gen_diesel' },
  { slot: 'coil1', template: 'coil_emp' },
  { slot: 'capacitor', template: 'cap_bank' },
  { slot: 'cooling', template: 'cool_air' },
];
