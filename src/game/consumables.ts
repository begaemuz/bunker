import type { ResourceKey } from './types';

/**
 * Расходные предметы: хранятся в инвентаре стопками, а не как валюта.
 * Автопродажа их не трогает, лимит склада на них не распространяется.
 */
export const CONSUMABLES = ['scrap', 'techParts', 'components', 'blueprints', 'energyCores', 'stabilizers', 'expansionKeys', 'bossPasses', 'skillResets'] as const;
/** Частые ресурсы не показываются в ленте добычи, чтобы не засорять её. */
export const FEED_SKIP: ConsumableKey[] = ['scrap', 'techParts'];
export type ConsumableKey = (typeof CONSUMABLES)[number];

/** Валюты — показываются в полосе ресурсов на всех экранах. */
export const CURRENCIES: ResourceKey[] = ['coins', 'crystals'];

export const consumableInfo: Record<ConsumableKey, { color: string; description: string; use: string }> = {
  scrap: {
    color: '#a8b0b8',
    description: 'Металл с разбитых роботов. Основной материал для ремонта и улучшений.',
    use: 'Тратится при улучшении оборудования, исследованиях и обмене в магазине.',
  },
  techParts: {
    color: '#3fc8ff',
    description: 'Шестерни, платы и приводы из уцелевших механизмов.',
    use: 'Тратятся при улучшении оборудования и в «Науке».',
  },
  expansionKeys: {
    color: '#ff9f2e',
    description: 'Пробивает новое гнездо в оборудовании под модификацию.',
    use: 'Откройте карточку оборудования → «Модификации» → «Открыть ключом».',
  },
  stabilizers: {
    color: '#5fd16a',
    description: 'Защищает оборудование от уничтожения при неудачном улучшении.',
    use: 'Включается в окне улучшения оборудования.',
  },
  components: {
    color: '#3fe0c5',
    description: 'Микросхемы и узлы для синтеза модификаций.',
    use: 'Тратятся при объединении модификаций. Получить: разобрать ненужные модификации, изредка выпадают с роботов и боссов.',
  },
  blueprints: {
    color: '#4da3ff',
    description: 'Свиток с чертежами для продвинутых исследований и улучшений.',
    use: 'Тратится в «Науке» и при улучшении оборудования высоких уровней.',
  },
  energyCores: {
    color: '#b46bff',
    description: 'Редкое энергоядро. Нужно для высоких уровней оборудования, исследований и извлечения модификаций.',
    use: 'Тратится автоматически там, где требуется.',
  },
  skillResets: {
    color: '#ff9de2',
    description: 'Редчайший кристалл памяти. Изредка выпадает из боссов. Обнуляет все навыки «Науки» и возвращает очки, чтобы распределить их заново.',
    use: 'Нажмите «Сбросить навыки». Можно продать на аукционе.',
  },
  bossPasses: {
    color: '#ff4d6a',
    description: 'Позволяет вызвать босса текущей локации, не уничтожая группы роботов.',
    use: 'Нажмите «Вызвать босса» здесь или на экране боя.',
  },
};
