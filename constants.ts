import { ClassType, ItemRarity, ItemType, Stats, Item, Quest, ReputationType, DungeonBiome, Recipe, DungeonInfo, QuestCategory, Character } from './types';

// --- STATS & CLASSES ---
export const INITIAL_STATS: Record<ClassType, Stats> = {
  [ClassType.WARRIOR]: { str: 15, dex: 8, int: 3, vit: 12 },
  [ClassType.MAGE]: { str: 5, dex: 6, int: 16, vit: 8 },
  [ClassType.SCOUT]: { str: 7, dex: 14, int: 10, vit: 9 },
  [ClassType.HEALER]: { str: 6, dex: 7, int: 12, vit: 10 },
};

export const CLASS_DESCRIPTIONS: Record<ClassType, string> = {
  [ClassType.WARRIOR]: "Могучий боец. Ярость дарует силу в глубинах подземелий.",
  [ClassType.MAGE]: "Повелитель стихий. Огонь сжигает врагов дотла.",
  [ClassType.SCOUT]: "Тень во плоти. Находит лучшие трофеи и бьет точно в цель.",
  [ClassType.HEALER]: "Хранитель жизни. Исцеляет раны после каждого испытания.",
};

// Formula: 100 * L + 50 + 10 * L^2
export const XP_TO_LEVEL = (level: number) => 100 * level + 50 + 10 * Math.pow(level, 2);

export const STAT_POINTS_PER_LEVEL = (level: number) => 5 + Math.floor(level / 3);

// --- COLORS ---
export const RARITY_COLORS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: '#f8f8f2',
  [ItemRarity.UNCOMMON]: '#50fa7b',
  [ItemRarity.RARE]: '#8be9fd',
  [ItemRarity.EPIC]: '#bd93f9',
  [ItemRarity.LEGENDARY]: '#ffb86c',
};

export const MOOD_EMOJIS = {
  'Inspired': '🤩',
  'Tired': '😴',
  'Neutral': '😐',
  'Regret': '😞'
};

// --- ITEM DATABASE ---

const createItem = (
    baseId: string, name: string, type: ItemType, rarity: ItemRarity, level: number, 
    stats: Partial<Stats> = {}, effect: string = '', icon: string = '📦', 
    classReq?: ClassType, heal?: number
): Item => {
    // Price Formula: (Level * 10) * RarityMultiplier
    const mult = { [ItemRarity.COMMON]: 1, [ItemRarity.UNCOMMON]: 3, [ItemRarity.RARE]: 10, [ItemRarity.EPIC]: 30, [ItemRarity.LEGENDARY]: 100 };
    const price = (level * 10) * mult[rarity];

    return {
        id: baseId,
        name,
        type,
        rarity,
        levelReq: level,
        price,
        stats,
        effect,
        icon,
        classReq,
        healAmount: heal,
    };
};

export const ITEMS_DATABASE: Item[] = [
    // --- WARRIOR WEAPONS ---
    createItem('w_war_1', 'Ржавый меч', ItemType.WEAPON, ItemRarity.COMMON, 1, { str: 5 }, '', '🗡️', ClassType.WARRIOR),
    createItem('w_war_2', 'Клинок стража', ItemType.WEAPON, ItemRarity.UNCOMMON, 5, { str: 10 }, '+5% Крит', '🗡️', ClassType.WARRIOR),
    createItem('w_war_3', 'Секира гнева', ItemType.WEAPON, ItemRarity.RARE, 10, { str: 18 }, 'Крит +15 урона', '🪓', ClassType.WARRIOR),
    createItem('w_war_4', 'Меч Непокорённого', ItemType.WEAPON, ItemRarity.EPIC, 15, { str: 25 }, '+10% Скор. атаки при убийстве', '⚔️', ClassType.WARRIOR),
    createItem('w_war_5', 'Легионерский глеф', ItemType.WEAPON, ItemRarity.LEGENDARY, 20, { str: 35 }, 'Убивает <20% HP (раз в 5 атак)', '🔱', ClassType.WARRIOR),

    // --- MAGE WEAPONS ---
    createItem('w_mag_1', 'Посох новичка', ItemType.WEAPON, ItemRarity.COMMON, 1, { int: 3 }, '', '🪄', ClassType.MAGE),
    createItem('w_mag_2', 'Жезл пламени', ItemType.WEAPON, ItemRarity.UNCOMMON, 5, { int: 8 }, '+5% Огнем', '🔥', ClassType.MAGE),
    createItem('w_mag_3', 'Сфера хаоса', ItemType.WEAPON, ItemRarity.RARE, 10, { int: 15 }, '10% Поджечь', '🔮', ClassType.MAGE),
    createItem('w_mag_4', 'Посох вечной зимы', ItemType.WEAPON, ItemRarity.EPIC, 15, { int: 22 }, 'Заморозка (1 раз/бой)', '❄️', ClassType.MAGE),
    createItem('w_mag_5', 'Ключ Архимага', ItemType.WEAPON, ItemRarity.LEGENDARY, 20, { int: 30 }, '+50% Урона, x2 Маны', '🗝️', ClassType.MAGE),

    // --- SCOUT WEAPONS ---
    createItem('w_sct_1', 'Кинжал вора', ItemType.WEAPON, ItemRarity.COMMON, 1, { dex: 4 }, '', '🔪', ClassType.SCOUT),
    createItem('w_sct_2', 'Клинки теней', ItemType.WEAPON, ItemRarity.UNCOMMON, 5, { dex: 7 }, '+8% Крит', '🗡️', ClassType.SCOUT),
    createItem('w_sct_3', 'Ядовитые иглы', ItemType.WEAPON, ItemRarity.RARE, 10, { dex: 12 }, '15% Яд', '💉', ClassType.SCOUT),
    createItem('w_sct_4', 'Призрачный клинок', ItemType.WEAPON, ItemRarity.EPIC, 15, { dex: 18 }, 'Первый удар крит', '👻', ClassType.SCOUT),
    createItem('w_sct_5', 'Лезвия судьбы', ItemType.WEAPON, ItemRarity.LEGENDARY, 20, { dex: 25 }, '50% Уворот при HP < 30%', '⚔️', ClassType.SCOUT),

    // --- HEALER WEAPONS ---
    createItem('w_hlr_1', 'Посох ученика', ItemType.WEAPON, ItemRarity.COMMON, 1, { int: 3 }, '', '🦯', ClassType.HEALER),
    createItem('w_hlr_2', 'Жезл милосердия', ItemType.WEAPON, ItemRarity.UNCOMMON, 5, { int: 6 }, '+5% Лечение', '✨', ClassType.HEALER),
    createItem('w_hlr_3', 'Скипетр восст.', ItemType.WEAPON, ItemRarity.RARE, 10, { int: 10 }, '+5 HP реген/ход', '⚕️', ClassType.HEALER),
    createItem('w_hlr_4', 'Посох света', ItemType.WEAPON, ItemRarity.EPIC, 15, { int: 16 }, 'Лечение снимает дебафф', '🌟', ClassType.HEALER),
    createItem('w_hlr_5', 'Сердце целителя', ItemType.WEAPON, ItemRarity.LEGENDARY, 20, { int: 22 }, '+20% HP группе', '💖', ClassType.HEALER),

    // --- HEAD ARMOR ---
    createItem('a_head_1', 'Кожаный капюшон', ItemType.HEAD, ItemRarity.COMMON, 1, { dex: 2 }, '', '🧢'),
    createItem('a_head_2', 'Шлем стража', ItemType.HEAD, ItemRarity.UNCOMMON, 5, { vit: 5 }, '', '🪖'),
    createItem('a_head_3', 'Маска мудреца', ItemType.HEAD, ItemRarity.RARE, 10, { int: 7 }, '+3% Мана', '🎭'),
    createItem('a_head_4', 'Корона воина', ItemType.HEAD, ItemRarity.EPIC, 15, { str: 5, vit: 5 }, '+10% Защита при <50% HP', '👑'),
    createItem('a_head_5', 'Венец вечности', ItemType.HEAD, ItemRarity.LEGENDARY, 20, { str: 5, dex: 5, int: 5, vit: 5 }, 'Все статы +5', '🤴'),

    // --- BODY ARMOR ---
    createItem('a_body_1', 'Рваная рубаха', ItemType.BODY, ItemRarity.COMMON, 1, { vit: 1 }, '', '👕'),
    createItem('a_body_2', 'Кожаный доспех', ItemType.BODY, ItemRarity.UNCOMMON, 5, { vit: 4 }, '', '🧥'),
    createItem('a_body_3', 'Мантия стихий', ItemType.BODY, ItemRarity.RARE, 10, { vit: 6, int: 3 }, '+10% Сопротивление', '👘'),
    createItem('a_body_4', 'Доспех титана', ItemType.BODY, ItemRarity.EPIC, 15, { vit: 15 }, 'Блок 1 атаки', '🛡️'),
    createItem('a_body_5', 'Плащ реальности', ItemType.BODY, ItemRarity.LEGENDARY, 20, { vit: 10, dex: 10 }, 'Возрождение с 1 HP (1 раз/день)', '🌌'),

    // --- RINGS ---
    createItem('acc_ring_1', 'Медное кольцо', ItemType.RING, ItemRarity.COMMON, 1, { vit: 1 }, '', '💍'),
    createItem('acc_ring_2', 'Кольцо удачи', ItemType.RING, ItemRarity.UNCOMMON, 5, {}, '+5% Дроп', '🍀'),
    createItem('acc_ring_3', 'Кольцо времени', ItemType.RING, ItemRarity.RARE, 10, { dex: 3 }, 'Магазин медленнее', '⏳'),
    createItem('acc_ring_4', 'Печать героя', ItemType.RING, ItemRarity.EPIC, 15, { str: 5 }, '+10% XP за квесты', '🏵️'),
    createItem('acc_ring_5', 'Кольцо судьбы', ItemType.RING, ItemRarity.LEGENDARY, 20, { int: 5 }, 'Гарант Rare за квест', '🧿'),

    // --- AMULETS ---
    createItem('acc_amu_1', 'Каменный амулет', ItemType.AMULET, ItemRarity.COMMON, 1, { vit: 2 }, '', '📿'),
    createItem('acc_amu_2', 'Амулет зверя', ItemType.AMULET, ItemRarity.UNCOMMON, 5, { str: 3, dex: 3 }, '', '🐺'),
    createItem('acc_amu_3', 'Амулет знаний', ItemType.AMULET, ItemRarity.RARE, 10, { int: 5 }, '+2% Навыки', '📚'),
    createItem('acc_amu_4', 'Амулет баланса', ItemType.AMULET, ItemRarity.EPIC, 15, { str: 3, dex: 3, int: 3, vit: 3 }, 'Баланс', '☯️'),
    createItem('acc_amu_5', 'Сердце мира', ItemType.AMULET, ItemRarity.LEGENDARY, 20, { vit: 20 }, 'Реген в реале', '🌍'),

    // --- CONSUMABLES ---
    createItem('pot_hp_s', 'Малое зелье', ItemType.POTION, ItemRarity.COMMON, 1, {}, 'Восст. 20 HP', '🍷', undefined, 20),
    createItem('pot_sta', 'Зелье выносливости', ItemType.POTION, ItemRarity.UNCOMMON, 5, {}, '+10 ВЫН (5 ходов)', '🧪'), // Simplified logic, behaves as heal or buff in full implementation
    createItem('pot_mana', 'Эликсир ясности', ItemType.POTION, ItemRarity.RARE, 10, {}, 'Восст. Ману', '💧'),
    createItem('pot_hero', 'Зелье героя', ItemType.POTION, ItemRarity.EPIC, 15, {}, '+10 Все статы (3 хода)', '🥃'),
    createItem('pot_full', 'Слеза феникса', ItemType.POTION, ItemRarity.LEGENDARY, 20, {}, 'Полное исцеление', '🏺', undefined, 9999),
    
    // --- SCROLLS ---
    createItem('scr_esc', 'Свиток побега', ItemType.SCROLL, ItemRarity.COMMON, 1, {}, 'Побег без штрафа', '📜'),
];

export const HEALTH_POTION = ITEMS_DATABASE.find(i => i.id === 'pot_hp_s')!;

// --- QUEST POOLS ---

const createQuestTemplate = (title: string, desc: string, rep: ReputationType, diff: number, rarity: ItemRarity): Omit<Quest, 'id' | 'completed' | 'rewardGold' | 'rewardExp' | 'category'> => ({
    title, description: desc, reputationType: rep, difficulty: diff, rarity
});

export const DAILY_QUEST_POOL = [
    createQuestTemplate("Живительная влага", "Выпить 2 литра воды.", ReputationType.DISCIPLINE, 1, ItemRarity.COMMON),
    createQuestTemplate("Утренняя разминка", "10 минут растяжки или зарядки.", ReputationType.DISCIPLINE, 2, ItemRarity.COMMON),
    createQuestTemplate("Путь странника", "Прогулка на свежем воздухе 30 минут.", ReputationType.DISCIPLINE, 2, ItemRarity.COMMON),
    createQuestTemplate("Тихая трапеза", "Завтрак без использования гаджетов.", ReputationType.DISCIPLINE, 1, ItemRarity.COMMON),
    createQuestTemplate("Хроники побед", "Записать 3 хороших события дня.", ReputationType.CREATIVITY, 2, ItemRarity.COMMON),
    createQuestTemplate("Сила воина", "Выполнить 15 отжиманий.", ReputationType.HEROISM, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Мудрость древних", "Прочесть 10 страниц книги.", ReputationType.CREATIVITY, 2, ItemRarity.COMMON),
    createQuestTemplate("Дар слова", "Поблагодарить кого-то от души.", ReputationType.HEROISM, 1, ItemRarity.COMMON),
    createQuestTemplate("Пища героев", "Приготовить полезный ужин.", ReputationType.DISCIPLINE, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Созерцание", "5 минут полной тишины и покоя.", ReputationType.DISCIPLINE, 2, ItemRarity.COMMON),
    createQuestTemplate("Порядок в мыслях", "Навести порядок на рабочем столе.", ReputationType.DISCIPLINE, 1, ItemRarity.COMMON),
    createQuestTemplate("Стойкость", "Сделать 20 приседаний.", ReputationType.HEROISM, 2, ItemRarity.COMMON),
    createQuestTemplate("Стратегия", "Составить план из 3 целей на завтра.", ReputationType.DISCIPLINE, 2, ItemRarity.COMMON),
    createQuestTemplate("Искренность", "Сделать честный комплимент.", ReputationType.HEROISM, 1, ItemRarity.COMMON),
    createQuestTemplate("Подготовка ко сну", "Приглушить свет за 30 мин до сна.", ReputationType.DISCIPLINE, 2, ItemRarity.COMMON),
    createQuestTemplate("Дары природы", "Съесть 2 порции овощей.", ReputationType.DISCIPLINE, 2, ItemRarity.COMMON),
    createQuestTemplate("Дыхание жизни", "Дыхательная практика 5 минут.", ReputationType.DISCIPLINE, 2, ItemRarity.COMMON),
    createQuestTemplate("Ясный ум", "Не трогать телефон первый час утра.", ReputationType.DISCIPLINE, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Покой", "Выключить экраны за час до сна.", ReputationType.DISCIPLINE, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Зов крови", "Позвонить родным или близким.", ReputationType.HEROISM, 2, ItemRarity.COMMON),
];

export const WEEKLY_QUEST_POOL = [
    createQuestTemplate("Выносливость", "Пробежать суммарно 10 км за неделю.", ReputationType.DISCIPLINE, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Очищение разума", "Провести 5 часов (суммарно) без гаджетов.", ReputationType.DISCIPLINE, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Алхимия вкуса", "Приготовить 3 новых блюда.", ReputationType.CREATIVITY, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Путь атлета", "5 тренировок по 30 минут.", ReputationType.HEROISM, 5, ItemRarity.RARE),
    createQuestTemplate("Библиотекарь", "Прочитать более 150 страниц.", ReputationType.CREATIVITY, 5, ItemRarity.RARE),
    createQuestTemplate("Благодетель", "Помочь 3 людям в делах.", ReputationType.HEROISM, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Генеральная уборка", "Полная уборка жилища.", ReputationType.DISCIPLINE, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Отчет командира", "Подвести итоги недели и цели.", ReputationType.DISCIPLINE, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Разведка", "Посетить новое место в городе.", ReputationType.CREATIVITY, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Аскеза", "Ограничить сладкое до минимума.", ReputationType.DISCIPLINE, 5, ItemRarity.RARE),
    createQuestTemplate("Медитация", "7 дней практик осознанности подряд.", ReputationType.DISCIPLINE, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Казначей", "Вести учет расходов всю неделю.", ReputationType.DISCIPLINE, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Марш-бросок", "10,000 шагов 5 дней подряд.", ReputationType.DISCIPLINE, 5, ItemRarity.RARE),
    createQuestTemplate("Ученик", "Изучить новую тему (статья, урок).", ReputationType.CREATIVITY, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Бережливость", "Один день без денежных трат.", ReputationType.DISCIPLINE, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Летописец", "Сделать 3 записи в дневнике.", ReputationType.CREATIVITY, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Творец", "Нарисовать что-то или создать.", ReputationType.CREATIVITY, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Жертва крови", "Сдать кровь (донорство).", ReputationType.HEROISM, 5, ItemRarity.RARE),
    createQuestTemplate("Собрание", "Посетить общественное мероприятие.", ReputationType.HEROISM, 5, ItemRarity.RARE),
    createQuestTemplate("Архивариус", "Разобрать цифровые файлы и фото.", ReputationType.DISCIPLINE, 4, ItemRarity.UNCOMMON),
];

export const ONETIME_QUEST_POOL = [
    createQuestTemplate("Мечта", "Описать свою главную мечту.", ReputationType.CREATIVITY, 2, ItemRarity.COMMON),
    createQuestTemplate("Почтение", "Поблагодарить родителей за всё.", ReputationType.HEROISM, 2, ItemRarity.COMMON),
    createQuestTemplate("Исцеление души", "Посетить психолога.", ReputationType.DISCIPLINE, 5, ItemRarity.RARE),
    createQuestTemplate("Автобиография", "Написать историю своей жизни.", ReputationType.CREATIVITY, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Досье", "Составить профессиональное резюме.", ReputationType.DISCIPLINE, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Служение", "Подать заявку в волонтеры.", ReputationType.HEROISM, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Дальние земли", "Посетить новую страну.", ReputationType.CREATIVITY, 6, ItemRarity.LEGENDARY),
    createQuestTemplate("Марафон", "Пробежать марафонскую дистанцию.", ReputationType.DISCIPLINE, 5, ItemRarity.EPIC),
    createQuestTemplate("Глас народа", "Создать свой блог или сайт.", ReputationType.CREATIVITY, 4, ItemRarity.RARE),
    createQuestTemplate("Колесничий", "Получить водительские права.", ReputationType.DISCIPLINE, 4, ItemRarity.RARE),
    createQuestTemplate("Казна", "Начать вести личный бюджет.", ReputationType.DISCIPLINE, 2, ItemRarity.COMMON),
    createQuestTemplate("Тайный Санта", "Сделать подарок незнакомцу.", ReputationType.HEROISM, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Друид", "Посадить дерево.", ReputationType.HEROISM, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Послание в будущее", "Написать письмо себе будущему.", ReputationType.CREATIVITY, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Созыв соратников", "Организовать встречу друзей.", ReputationType.HEROISM, 3, ItemRarity.UNCOMMON),
    createQuestTemplate("Код предков", "Сделать генетический тест.", ReputationType.CREATIVITY, 5, ItemRarity.EPIC),
    createQuestTemplate("Наставник", "Найти ментора или учителя.", ReputationType.DISCIPLINE, 4, ItemRarity.RARE),
    createQuestTemplate("Личный герб", "Оформить профили в соцсетях.", ReputationType.CREATIVITY, 4, ItemRarity.UNCOMMON),
    createQuestTemplate("Оратор", "Выступить публично.", ReputationType.HEROISM, 4, ItemRarity.RARE),
    createQuestTemplate("Свое дело", "Запустить собственный проект.", ReputationType.CREATIVITY, 6, ItemRarity.EPIC),
];

// Event items
const HAT_SANTA: Item = { id: 'evt_santa', name: 'Шапка Деда Мороза', type: ItemType.HEAD, rarity: ItemRarity.EPIC, price: 0, levelReq: 1, effect: '+5 Хар, Зимой +10% XP', icon: '🎅' };
const RING_NATURE: Item = { id: 'evt_nature', name: 'Кольцо Природы', type: ItemType.RING, rarity: ItemRarity.EPIC, price: 0, levelReq: 1, effect: '+15% Сопр.', icon: '🌱' };
const MASK_GHOST: Item = { id: 'evt_ghost', name: 'Маска Призрака', type: ItemType.HEAD, rarity: ItemRarity.EPIC, price: 0, levelReq: 1, effect: '+20% Урон в Некрополе', icon: '🎃' };

interface EventDefinition {
    dateMatch: (d: Date) => boolean;
    quest: Omit<Quest, 'id' | 'completed' | 'rewardGold' | 'rewardExp' | 'category'>;
    rewardItem?: Item;
}

export const EVENT_DEFINITIONS: EventDefinition[] = [
    {
        dateMatch: (d) => d.getMonth() === 11 && d.getDate() === 31,
        quest: { title: "Новогоднее чудо", description: "Поздравить 5 друзей.", reputationType: ReputationType.HEROISM, difficulty: 3, rarity: ItemRarity.EPIC },
        rewardItem: HAT_SANTA
    },
    {
        dateMatch: (d) => d.getMonth() === 3 && d.getDate() === 22, // Apr 22
        quest: { title: "День Земли", description: "Посадить растение или убраться.", reputationType: ReputationType.HEROISM, difficulty: 3, rarity: ItemRarity.EPIC },
        rewardItem: RING_NATURE
    },
    {
        dateMatch: (d) => d.getMonth() === 9 && d.getDate() === 31, // Oct 31
        quest: { title: "Хэллоуин", description: "Нарисовать тыкву.", reputationType: ReputationType.CREATIVITY, difficulty: 3, rarity: ItemRarity.EPIC },
        rewardItem: MASK_GHOST
    }
];

// --- MATERIALS ---
export const MATERIALS: Record<string, Item> = {
    SKIN: { id: 'm_skin', name: 'Шкура', type: ItemType.MATERIAL, rarity: ItemRarity.COMMON, price: 5, levelReq: 1, materialType: 'BIO', icon: '🥓' },
    POISON: { id: 'm_poison', name: 'Яд', type: ItemType.MATERIAL, rarity: ItemRarity.UNCOMMON, price: 15, levelReq: 3, materialType: 'BIO', icon: '🧪' },
    FEATHER: { id: 'm_feather', name: 'Перо', type: ItemType.MATERIAL, rarity: ItemRarity.COMMON, price: 5, levelReq: 1, materialType: 'BIO', icon: '🪶' },
    ROOT: { id: 'm_root', name: 'Корень', type: ItemType.MATERIAL, rarity: ItemRarity.COMMON, price: 5, levelReq: 1, materialType: 'BIO', icon: '🥕' },
    ORE: { id: 'm_ore', name: 'Руда', type: ItemType.MATERIAL, rarity: ItemRarity.COMMON, price: 8, levelReq: 2, materialType: 'MINERAL', icon: '🪨' },
    CRYSTAL: { id: 'm_crystal', name: 'Кристалл', type: ItemType.MATERIAL, rarity: ItemRarity.RARE, price: 50, levelReq: 5, materialType: 'MINERAL', icon: '💎' },
    SHARD: { id: 'm_shard', name: 'Осколок', type: ItemType.MATERIAL, rarity: ItemRarity.UNCOMMON, price: 20, levelReq: 3, materialType: 'MINERAL', icon: '🧊' },
    ESSENCE: { id: 'm_essence', name: 'Эссенция', type: ItemType.MATERIAL, rarity: ItemRarity.RARE, price: 60, levelReq: 8, materialType: 'MAGIC', icon: '✨' },
    DUST: { id: 'm_dust', name: 'Астральный пыль', type: ItemType.MATERIAL, rarity: ItemRarity.EPIC, price: 150, levelReq: 12, materialType: 'MAGIC', icon: '🎇' },
    SOUL: { id: 'm_soul', name: 'Душа', type: ItemType.MATERIAL, rarity: ItemRarity.EPIC, price: 200, levelReq: 15, materialType: 'MAGIC', icon: '👻' },
    CORE_FRAGMENT: { id: 'm_core', name: 'Фрагмент Ядра', type: ItemType.MATERIAL, rarity: ItemRarity.LEGENDARY, price: 1000, levelReq: 20, materialType: 'ARTIFACT', icon: '⚛️' },
};

// --- DUNGEONS ---
export const DUNGEONS: DungeonInfo[] = [
    { id: 'forest', name: 'Тихий Лес', biome: DungeonBiome.FOREST, minLevel: 1, maxLevel: 5, description: "Начало пути. Шелест листвы скрывает опасность.", effectDescription: "Без эффектов" },
    { id: 'cave', name: 'Тенистая Пещера', biome: DungeonBiome.CAVE, minLevel: 3, maxLevel: 8, description: "Сырые туннели, где эхо сводит с ума.", effectDescription: "Эхо (звук)" },
    { id: 'swamp', name: 'Лабиринт Болот', biome: DungeonBiome.SWAMP, minLevel: 5, maxLevel: 12, description: "Вязкая топь затягивает неосторожных.", effectDescription: "Туман: -10% Точность" },
    { id: 'desert', name: 'Пустыня Забвения', biome: DungeonBiome.DESERT, minLevel: 8, maxLevel: 15, description: "Бескрайние пески под палящим солнцем.", effectDescription: "Жара: -2 HP/ход" },
    { id: 'ice', name: 'Ледяной Монастырь', biome: DungeonBiome.ICE, minLevel: 10, maxLevel: 20, description: "Обитель вечного холода.", effectDescription: "Холод: 15% шанс пропуска" },
    { id: 'necropolis', name: 'Некрополь', biome: DungeonBiome.NECROPOLIS, minLevel: 15, maxLevel: 25, description: "Земля мертвых, где нет покоя.", effectDescription: "Нежить (Иммун. к ядам)" },
    { id: 'sky', name: 'Небесные Сады', biome: DungeonBiome.SKY, minLevel: 18, maxLevel: 30, description: "Парящие острова среди облаков.", effectDescription: "+10% Скорость" },
    { id: 'hell', name: 'Преисподняя', biome: DungeonBiome.HELL, minLevel: 22, maxLevel: 35, description: "Озеро огня и серы.", effectDescription: "+5 Урона врагам, -3 HP/ход" },
    { id: 'chaos', name: 'Башня Хаоса', biome: DungeonBiome.CHAOS, minLevel: 25, maxLevel: 45, description: "Искаженная реальность.", effectDescription: "Хаос (Случайные эффекты)" },
    { id: 'aether', name: 'Эфирный Чертог', biome: DungeonBiome.AETHER, minLevel: 30, maxLevel: 50, description: "Грань между мирами.", effectDescription: "Призрачность (30% уклонение врага)" },
];

// --- MOBS ---
interface MobTemplate {
    name: string;
    baseHp: number;
    drops: string[]; // Keys of MATERIALS
}

export const MOBS_BY_BIOME: Record<DungeonBiome, MobTemplate[]> = {
    [DungeonBiome.FOREST]: [
        { name: 'Крыса', baseHp: 20, drops: ['SKIN'] },
        { name: 'Вор', baseHp: 25, drops: ['FEATHER'] },
        { name: 'Кабан', baseHp: 40, drops: ['SKIN', 'ROOT'] },
    ],
    [DungeonBiome.CAVE]: [
        { name: 'Голем', baseHp: 80, drops: ['ORE'] },
        { name: 'Тролль', baseHp: 90, drops: ['SKIN'] },
        { name: 'Нетопырь', baseHp: 30, drops: ['SKIN'] },
    ],
    [DungeonBiome.SWAMP]: [
        { name: 'Утопец', baseHp: 110, drops: ['ROOT'] },
        { name: 'Жаба', baseHp: 60, drops: ['POISON'] },
        { name: 'Жижа', baseHp: 130, drops: ['ROOT'] },
    ],
    [DungeonBiome.DESERT]: [
        { name: 'Скорпион', baseHp: 70, drops: ['POISON', 'SHARD'] },
        { name: 'Мумия', baseHp: 100, drops: ['DUST'] },
        { name: 'Джинн', baseHp: 150, drops: ['ESSENCE'] },
    ],
    [DungeonBiome.ICE]: [
        { name: 'Волк', baseHp: 120, drops: ['SKIN', 'SHARD'] },
        { name: 'Йети', baseHp: 200, drops: ['SKIN'] },
        { name: 'Дух', baseHp: 90, drops: ['SHARD', 'ESSENCE'] },
    ],
    [DungeonBiome.NECROPOLIS]: [
        { name: 'Скелет', baseHp: 140, drops: ['ORE'] },
        { name: 'Лич', baseHp: 180, drops: ['DUST', 'SOUL'] },
        { name: 'Призрак', baseHp: 100, drops: ['ESSENCE'] },
    ],
    [DungeonBiome.SKY]: [
        { name: 'Грифон', baseHp: 250, drops: ['FEATHER', 'SKIN'] },
        { name: 'Элементаль', baseHp: 200, drops: ['ESSENCE'] },
        { name: 'Гарпия', baseHp: 180, drops: ['FEATHER'] },
    ],
    [DungeonBiome.HELL]: [
        { name: 'Бес', baseHp: 150, drops: ['ORE'] },
        { name: 'Демон', baseHp: 300, drops: ['ORE', 'SOUL'] },
        { name: 'Гончая', baseHp: 220, drops: ['SKIN', 'POISON'] },
    ],
    [DungeonBiome.CHAOS]: [
        { name: 'Мутант', baseHp: 400, drops: ['POISON', 'ORE'] },
        { name: 'Глаз', baseHp: 300, drops: ['ESSENCE', 'DUST'] },
    ],
    [DungeonBiome.AETHER]: [
        { name: 'Страж', baseHp: 500, drops: ['SHARD', 'SOUL'] },
        { name: 'Пожиратель', baseHp: 450, drops: ['DUST', 'ESSENCE'] },
    ],
};

// --- RECIPES ---
export const RECIPES: Recipe[] = [
    {
        id: 'r_regen_pot',
        resultItem: { id: 'regen_pot', name: 'Зелье регенерации', type: ItemType.POTION, rarity: ItemRarity.UNCOMMON, price: 100, levelReq: 3, healAmount: 30, effect: 'Реген +5 HP/ход', icon: '🧪' },
        materials: [{ name: 'Шкура', count: 3 }, { name: 'Корень', count: 1 }],
        goldCost: 50
    },
    {
        id: 'r_dagger_shadow',
        resultItem: { id: 'dag_shadow', name: 'Кинжал теней', type: ItemType.WEAPON, rarity: ItemRarity.RARE, price: 500, levelReq: 5, stats: { dex: 8 }, effect: '10% Отравление', icon: '🗡️' },
        materials: [{ name: 'Яд', count: 2 }, { name: 'Руда', count: 4 }],
        goldCost: 200
    },
    {
        id: 'r_amulet_ele',
        resultItem: { id: 'amu_ele', name: 'Амулет стихий', type: ItemType.AMULET, rarity: ItemRarity.RARE, price: 600, levelReq: 8, effect: '+10% Сопротивление', icon: '🧿' },
        materials: [{ name: 'Кристалл', count: 1 }, { name: 'Эссенция', count: 1 }],
        goldCost: 300
    },
    {
        id: 'r_armor_legion',
        resultItem: { id: 'arm_legion', name: 'Броня Легиона', type: ItemType.BODY, rarity: ItemRarity.EPIC, price: 2000, levelReq: 15, stats: { vit: 15 }, effect: 'Блок 1 атаки', icon: '🛡️' },
        materials: [{ name: 'Руда', count: 5 }, { name: 'Душа', count: 2 }],
        goldCost: 1000
    },
    {
        id: 'r_tear_phoenix',
        resultItem: { id: 'tear_phoenix', name: 'Слеза Феникса', type: ItemType.POTION, rarity: ItemRarity.LEGENDARY, price: 5000, levelReq: 20, healAmount: 9999, effect: 'Полное исцеление', icon: '🏺' },
        materials: [{ name: 'Эссенция', count: 3 }, { name: 'Фрагмент Ядра', count: 1 }],
        goldCost: 2000
    }
];

// Helper to generate a loot item from the DB
export const generateLootItem = (targetLevel: number, rarity: ItemRarity, classType?: ClassType): Item => {
    // Filter by Rarity
    let candidates = ITEMS_DATABASE.filter(i => i.rarity === rarity);
    
    // Filter by Level (Candidate Level <= Target + 3 && Candidate Level >= Target - 5)
    // To allow finding SOMETHING, we relax this if empty
    let levelCandidates = candidates.filter(i => i.levelReq <= targetLevel + 3 && i.levelReq >= Math.max(1, targetLevel - 5));
    if (levelCandidates.length === 0) {
        // Fallback: Find closest level items
        levelCandidates = candidates.sort((a, b) => Math.abs(a.levelReq - targetLevel) - Math.abs(b.levelReq - targetLevel)).slice(0, 3);
    }
    candidates = levelCandidates;

    // Class Weighting: 60% chance to prefer class specific items
    if (classType && Math.random() < 0.6) {
        const classItems = candidates.filter(i => i.classReq === classType || !i.classReq);
        if (classItems.length > 0) candidates = classItems;
    }

    if (candidates.length === 0) {
        // Absolute Fallback
        return ITEMS_DATABASE[0]; 
    }

    const template = candidates[Math.floor(Math.random() * candidates.length)];
    return { ...template, id: Math.random().toString(36) };
};

export const generateLootForSource = (character: Character, sourceLevel: number, source: 'MOB' | 'ELITE' | 'BOSS' | 'QUEST', biome?: DungeonBiome): Item | null => {
    // 50% chance for material drop if from mob/elite/boss
    if (biome && Math.random() < 0.5 && source !== 'QUEST') {
        const mobTemplate = MOBS_BY_BIOME[biome][0];
        const drops = mobTemplate.drops;
        const matKey = drops[Math.floor(Math.random() * drops.length)];
        return { ...MATERIALS[matKey], id: Math.random().toString() };
    }

    // Drop Chance Formula: Base * (1 + Luck/100) * ClassBonus
    let baseChance = 0.05; // 5% default
    if (source === 'ELITE') baseChance = 0.2;
    if (source === 'BOSS') baseChance = 1.0;
    if (source === 'QUEST') baseChance = 0.5;

    let classBonus = 1.0;
    if (character.classType === ClassType.SCOUT) classBonus = 1.3;
    if (character.classType === ClassType.MAGE) classBonus = 1.1;
    if (character.classType === ClassType.HEALER) classBonus = 1.05;

    const playerLuck = character.stats.dex / 2; 
    const dropChance = baseChance * (1 + playerLuck / 100) * classBonus;

    if (Math.random() > dropChance) return null;

    // Rarity Logic: 70/90/97 thresholds
    const roll = Math.random() * 100;
    let rarity = ItemRarity.COMMON;
    const epicThreshold = source === 'BOSS' ? 94 : 97;

    if (roll > epicThreshold) rarity = ItemRarity.EPIC;
    else if (roll > 90) rarity = ItemRarity.RARE;
    else if (roll > 70) rarity = ItemRarity.UNCOMMON;
    
    // Tiny chance for Legendary on high levels or Bosses
    if (source === 'BOSS' && Math.random() > 0.95) rarity = ItemRarity.LEGENDARY;

    return generateLootItem(sourceLevel, rarity, character.classType);
};

export const generateRandomItem = (targetLevel: number, forcedRarity?: ItemRarity): Item => {
    const roll = Math.random() * 100;
    let rarity = forcedRarity || ItemRarity.COMMON;
    if (!forcedRarity) {
        if (roll > 98) rarity = ItemRarity.LEGENDARY;
        else if (roll > 90) rarity = ItemRarity.EPIC;
        else if (roll > 70) rarity = ItemRarity.RARE;
        else if (roll > 40) rarity = ItemRarity.UNCOMMON;
    }
    return generateLootItem(targetLevel, rarity);
}
