import type { ResourceKey } from './types';

/**
 * Расходные предметы: хранятся в инвентаре стопками, а не как валюта.
 * Автопродажа их не трогает, лимит склада на них не распространяется.
 */
export const CONSUMABLES = ['expansionKeys', 'stabilizers', 'blueprints', 'energyCores', 'bossPasses'] as const;
export type ConsumableKey = (typeof CONSUMABLES)[number];

/** Валюты — показываются в полосе ресурсов на всех экранах. */
export const CURRENCIES: ResourceKey[] = ['coins', 'scrap', 'techParts', 'crystals'];

export const consumableInfo: Record<ConsumableKey, { color: string; description: string; use: string }> = {
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
  bossPasses: {
    color: '#ff4d6a',
    description: 'Позволяет вызвать босса текущей локации, не уничтожая группы роботов.',
    use: 'Нажмите «Вызвать босса» здесь или на экране боя.',
  },
};
