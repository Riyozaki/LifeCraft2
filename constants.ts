import { ClassType, ItemRarity, ItemType, Stats, Item, Quest, ReputationType, DungeonBiome, Recipe, DungeonInfo, QuestCategory, Character, MaterialType, Mob } from './types';

// --- CONFIGURATION & BALANCE ---
export const GAME_BALANCE = {
    DROP_RATES: {
        BASE: 0.05,
        ELITE_BONUS: 0.15, // Adds to base
        BOSS_FIXED: 1.0,   // Guaranteed
        LUCK_FACTOR: 50,   // dex / 50 (Buffed luck impact)
    },
    RARITY_THRESHOLDS: {
        LEGENDARY: 98,
        EPIC: 90,
        RARE: 70,
        UNCOMMON: 40
    },
    SCALING: {
        DAMAGE_STAT_MULT: 0.05, // 1 Stat point = +5% Base Damage
        DEFENSE_DIVISOR: 100, // Mitigation = 100 / (100 + Def)
        // Improved scaling to match item prices (1.15^L instead of 1.1^L)
        QUEST_GOLD_SCALING: 1.15, 
        QUEST_XP_SCALING: 1.15, 
    }
};

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

// Rebalanced XP Curve: Smoother progression at mid-levels.
// Old: 100L + 50 + 10L^2
// New: 150L + 50 * L^1.3
export const XP_TO_LEVEL = (level: number) => Math.floor(150 * level + 50 * Math.pow(level, 1.3));

export const STAT_POINTS_PER_LEVEL = (level: number) => 5 + Math.floor(level / 5);

// --- BUFF EFFECTS ---
export const BUFF_EFFECTS: Record<string, (stats: Stats) => Stats> = {
    'str_boost_small': (s) => ({ ...s, str: s.str + 2 }),
    'dex_boost_small': (s) => ({ ...s, dex: s.dex + 2 }),
    'int_boost_small': (s) => ({ ...s, int: s.int + 2 }),
    'vit_boost_small': (s) => ({ ...s, vit: s.vit + 2 }),
    'all_boost_large': (s) => ({ str: s.str + 10, dex: s.dex + 10, int: s.int + 10, vit: s.vit + 10 }),
};

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

// --- HELPER FOR UUID ---
export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// --- ITEM DATABASE ---

const createItem = (
    baseId: string, name: string, type: ItemType, rarity: ItemRarity, level: number, 
    stats: Partial<Stats> = {}, effect: string = '', icon: string = '📦', 
    classReq?: ClassType, heal?: number, matType?: MaterialType
): Item => {
    // Price Formula: (Level * 10) * RarityMultiplier
    const mult = { [ItemRarity.COMMON]: 1, [ItemRarity.UNCOMMON]: 3, [ItemRarity.RARE]: 10, [ItemRarity.EPIC]: 30, [ItemRarity.LEGENDARY]: 100 };
    const price = (level * 10) * mult[rarity];

    const isStackable = [ItemType.MATERIAL, ItemType.POTION, ItemType.SCROLL, ItemType.FOOD].includes(type);

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
        materialType: matType,
        stackable: isStackable,
        amount: 1
    };
};

export const ITEMS_DATABASE: Item[] = [
    // --- WARRIOR WEAPONS ---
    createItem('w_war_0', 'Деревянный меч', ItemType.WEAPON, ItemRarity.COMMON, 1, { str: 2 }, 'Тренировочный', '🗡️', ClassType.WARRIOR),
    createItem('w_war_1', 'Ржавый меч', ItemType.WEAPON, ItemRarity.COMMON, 2, { str: 5 }, '', '🗡️', ClassType.WARRIOR),
    createItem('w_war_2', 'Клинок стража', ItemType.WEAPON, ItemRarity.UNCOMMON, 5, { str: 10 }, '+5% Крит', '🗡️', ClassType.WARRIOR),
    createItem('w_war_3', 'Секира гнева', ItemType.WEAPON, ItemRarity.RARE, 10, { str: 18 }, 'Крит +15 урона', '🪓', ClassType.WARRIOR),
    createItem('w_war_4', 'Меч Непокорённого', ItemType.WEAPON, ItemRarity.EPIC, 15, { str: 25 }, '+10% Скор. атаки при убийстве', '⚔️', ClassType.WARRIOR),
    createItem('w_war_5', 'Легионерский глеф', ItemType.WEAPON, ItemRarity.LEGENDARY, 20, { str: 35 }, 'Убивает <20% HP (раз в 5 атак)', '🔱', ClassType.WARRIOR),

    // --- MAGE WEAPONS ---
    createItem('w_mag_0', 'Старая палочка', ItemType.WEAPON, ItemRarity.COMMON, 1, { int: 2 }, '', '🥢', ClassType.MAGE),
    createItem('w_mag_1', 'Посох новичка', ItemType.WEAPON, ItemRarity.COMMON, 2, { int: 3 }, '', '🪄', ClassType.MAGE),
    createItem('w_mag_2', 'Жезл пламени', ItemType.WEAPON, ItemRarity.UNCOMMON, 5, { int: 8 }, '+5% Огнем', '🔥', ClassType.MAGE),
    createItem('w_mag_3', 'Сфера хаоса', ItemType.WEAPON, ItemRarity.RARE, 10, { int: 15 }, '10% Поджечь', '🔮', ClassType.MAGE),
    createItem('w_mag_4', 'Посох вечной зимы', ItemType.WEAPON, ItemRarity.EPIC, 15, { int: 22 }, 'Заморозка (1 раз/бой)', '❄️', ClassType.MAGE),
    createItem('w_mag_5', 'Ключ Архимага', ItemType.WEAPON, ItemRarity.LEGENDARY, 20, { int: 30 }, '+50% Урона, x2 Маны', '🗝️', ClassType.MAGE),

    // --- SCOUT WEAPONS ---
    createItem('w_sct_0', 'Перочинный нож', ItemType.WEAPON, ItemRarity.COMMON, 1, { dex: 2 }, '', '🔪', ClassType.SCOUT),
    createItem('w_sct_1', 'Кинжал вора', ItemType.WEAPON, ItemRarity.COMMON, 2, { dex: 4 }, '', '🔪', ClassType.SCOUT),
    createItem('w_sct_2', 'Клинки теней', ItemType.WEAPON, ItemRarity.UNCOMMON, 5, { dex: 7 }, '+8% Крит', '🗡️', ClassType.SCOUT),
    createItem('w_sct_3', 'Ядовитые иглы', ItemType.WEAPON, ItemRarity.RARE, 10, { dex: 12 }, '15% Яд', '💉', ClassType.SCOUT),
    createItem('w_sct_4', 'Призрачный клинок', ItemType.WEAPON, ItemRarity.EPIC, 15, { dex: 18 }, 'Первый удар крит', '👻', ClassType.SCOUT),
    createItem('w_sct_5', 'Лезвия судьбы', ItemType.WEAPON, ItemRarity.LEGENDARY, 20, { dex: 25 }, '50% Уворот при HP < 30%', '⚔️', ClassType.SCOUT),

    // --- HEALER WEAPONS ---
    createItem('w_hlr_0', 'Деревянный посох', ItemType.WEAPON, ItemRarity.COMMON, 1, { int: 2 }, '', '🦯', ClassType.HEALER),
    createItem('w_hlr_1', 'Посох ученика', ItemType.WEAPON, ItemRarity.COMMON, 2, { int: 3 }, '', '🦯', ClassType.HEALER),
    createItem('w_hlr_2', 'Жезл милосердия', ItemType.WEAPON, ItemRarity.UNCOMMON, 5, { int: 6 }, '+5% Лечение', '✨', ClassType.HEALER),
    createItem('w_hlr_3', 'Скипетр восст.', ItemType.WEAPON, ItemRarity.RARE, 10, { int: 10 }, '+5 HP реген/ход', '⚕️', ClassType.HEALER),
    createItem('w_hlr_4', 'Посох света', ItemType.WEAPON, ItemRarity.EPIC, 15, { int: 16 }, 'Лечение снимает дебафф', '🌟', ClassType.HEALER),
    createItem('w_hlr_5', 'Сердце целителя', ItemType.WEAPON, ItemRarity.LEGENDARY, 20, { int: 22 }, '+20% HP группе', '💖', ClassType.HEALER),

    // --- HEAD ARMOR ---
    createItem('a_head_0', 'Повязка', ItemType.HEAD, ItemRarity.COMMON, 1, { vit: 1 }, '', '🤕'),
    createItem('a_head_1', 'Кожаный капюшон', ItemType.HEAD, ItemRarity.COMMON, 2, { dex: 2 }, '', '🧢'),
    createItem('a_head_2', 'Шлем стража', ItemType.HEAD, ItemRarity.UNCOMMON, 5, { vit: 5 }, '', '🪖'),
    createItem('a_head_3', 'Маска мудреца', ItemType.HEAD, ItemRarity.RARE, 10, { int: 7 }, '+3% Мана', '🎭'),
    createItem('a_head_4', 'Корона воина', ItemType.HEAD, ItemRarity.EPIC, 15, { str: 5, vit: 5 }, '+10% Защита при <50% HP', '👑'),
    createItem('a_head_5', 'Венец вечности', ItemType.HEAD, ItemRarity.LEGENDARY, 20, { str: 5, dex: 5, int: 5, vit: 5 }, 'Все статы +5', '🤴'),

    // --- BODY ARMOR ---
    createItem('a_body_0', 'Тряпки', ItemType.BODY, ItemRarity.COMMON, 1, { vit: 1 }, '', '👕'),
    createItem('a_body_1', 'Рваная рубаха', ItemType.BODY, ItemRarity.COMMON, 2, { vit: 1 }, '', '👕'),
    createItem('a_body_2', 'Кожаный доспех', ItemType.BODY, ItemRarity.UNCOMMON, 5, { vit: 4 }, '', '🧥'),
    createItem('a_body_3', 'Мантия стихий', ItemType.BODY, ItemRarity.RARE, 10, { vit: 6, int: 3 }, '+10% Сопротивление', '👘'),
    createItem('a_body_4', 'Доспех титана', ItemType.BODY, ItemRarity.EPIC, 15, { vit: 15 }, 'Блок 1 атаки', '🛡️'),
    createItem('a_body_5', 'Плащ реальности', ItemType.BODY, ItemRarity.LEGENDARY, 20, { vit: 10, dex: 10 }, 'Возрождение с 1 HP (1 раз/день)', '🌌'),

    // --- RINGS ---
    createItem('acc_ring_1', 'Медное кольцо', ItemType.RING, ItemRarity.COMMON, 2, { vit: 1 }, '', '💍'),
    createItem('acc_ring_2', 'Кольцо удачи', ItemType.RING, ItemRarity.UNCOMMON, 5, {}, '+5% Дроп', '🍀'),
    createItem('acc_ring_3', 'Кольцо времени', ItemType.RING, ItemRarity.RARE, 10, { dex: 3 }, 'Магазин медленнее', '⏳'),
    createItem('acc_ring_4', 'Печать героя', ItemType.RING, ItemRarity.EPIC, 15, { str: 5 }, '+10% XP за квесты', '🏵️'),
    createItem('acc_ring_5', 'Кольцо судьбы', ItemType.RING, ItemRarity.LEGENDARY, 20, { int: 5 }, 'Гарант Rare за квест', '🧿'),

    // --- AMULETS ---
    createItem('acc_amu_1', 'Каменный амулет', ItemType.AMULET, ItemRarity.COMMON, 2, { vit: 2 }, '', '📿'),
    createItem('acc_amu_2', 'Амулет зверя', ItemType.AMULET, ItemRarity.UNCOMMON, 5, { str: 3, dex: 3 }, '', '🐺'),
    createItem('acc_amu_3', 'Амулет знаний', ItemType.AMULET, ItemRarity.RARE, 10, { int: 5 }, '+2% Навыки', '📚'),
    createItem('acc_amu_4', 'Амулет баланса', ItemType.AMULET, ItemRarity.EPIC, 15, { str: 3, dex: 3, int: 3, vit: 3 }, 'Баланс', '☯️'),
    createItem('acc_amu_5', 'Сердце мира', ItemType.AMULET, ItemRarity.LEGENDARY, 20, { vit: 20 }, 'Реген в реале', '🌍'),

    // --- CONSUMABLES ---
    createItem('pot_hp_s', 'Малое зелье', ItemType.POTION, ItemRarity.COMMON, 1, {}, '60 HP + 15%', '🍷', undefined, 60),
    createItem('pot_sta', 'Зелье выносливости', ItemType.POTION, ItemRarity.UNCOMMON, 5, {}, '+10 ВЫН (5 ходов)', '🧪'), 
    createItem('pot_mana', 'Эликсир ясности', ItemType.POTION, ItemRarity.RARE, 10, {}, 'Восст. Ману', '💧'),
    createItem('pot_hero', 'Зелье героя', ItemType.POTION, ItemRarity.EPIC, 15, {}, '+10 Все статы (3 хода)', '🥃'),
    createItem('pot_full', 'Слеза феникса', ItemType.POTION, ItemRarity.LEGENDARY, 20, {}, 'Полное исцеление', '🏺', undefined, 9999),
    
    // --- SCROLLS ---
    createItem('scr_esc', 'Свиток побега', ItemType.SCROLL, ItemRarity.COMMON, 1, {}, 'Побег без штрафа', '📜'),

    // --- MATERIALS ---
    createItem('m_skin', 'Шкура', ItemType.MATERIAL, ItemRarity.COMMON, 1, {}, '', '🥓', undefined, undefined, MaterialType.BIO),
    createItem('m_poison', 'Яд', ItemType.MATERIAL, ItemRarity.UNCOMMON, 3, {}, '', '🧪', undefined, undefined, MaterialType.BIO),
    createItem('m_feather', 'Перо', ItemType.MATERIAL, ItemRarity.COMMON, 1, {}, '', '🪶', undefined, undefined, MaterialType.BIO),
    createItem('m_root', 'Корень', ItemType.MATERIAL, ItemRarity.COMMON, 1, {}, '', '🥕', undefined, undefined, MaterialType.BIO),
    createItem('m_ore', 'Руда', ItemType.MATERIAL, ItemRarity.COMMON, 2, {}, '', '🪨', undefined, undefined, MaterialType.MINERAL),
    createItem('m_crystal', 'Кристалл', ItemType.MATERIAL, ItemRarity.RARE, 5, {}, '', '💎', undefined, undefined, MaterialType.MINERAL),
    createItem('m_shard', 'Осколок', ItemType.MATERIAL, ItemRarity.UNCOMMON, 3, {}, '', '🧊', undefined, undefined, MaterialType.MINERAL),
    createItem('m_essence', 'Эссенция', ItemType.MATERIAL, ItemRarity.RARE, 8, {}, '', '✨', undefined, undefined, MaterialType.MAGIC),
    createItem('m_dust', 'Астральный пыль', ItemType.MATERIAL, ItemRarity.EPIC, 12, {}, '', '🎇', undefined, undefined, MaterialType.MAGIC),
    createItem('m_soul', 'Душа', ItemType.MATERIAL, ItemRarity.EPIC, 15, {}, '', '👻', undefined, undefined, MaterialType.MAGIC),
    createItem('m_core', 'Фрагмент Ядра', ItemType.MATERIAL, ItemRarity.LEGENDARY, 20, {}, '', '⚛️', undefined, undefined, MaterialType.ARTIFACT),
];

export const HEALTH_POTION = ITEMS_DATABASE.find(i => i.id === 'pot_hp_s')!;

// --- RECIPES ---
// Rebalanced recipes with progression
export const RECIPES: Recipe[] = [
    // --- STARTER GEAR (Level 1, Cheap) ---
    {
        id: 'r_start_sword',
        resultItem: ITEMS_DATABASE.find(i => i.id === 'w_war_0')!,
        materials: [{ name: 'Руда', count: 1 }],
        goldCost: 10
    },
    {
        id: 'r_start_wand',
        resultItem: ITEMS_DATABASE.find(i => i.id === 'w_mag_0')!,
        materials: [{ name: 'Корень', count: 1 }],
        goldCost: 10
    },
    {
        id: 'r_start_dagger',
        resultItem: ITEMS_DATABASE.find(i => i.id === 'w_sct_0')!,
        materials: [{ name: 'Руда', count: 1 }],
        goldCost: 10
    },
    {
        id: 'r_start_staff',
        resultItem: ITEMS_DATABASE.find(i => i.id === 'w_hlr_0')!,
        materials: [{ name: 'Корень', count: 1 }],
        goldCost: 10
    },
    {
        id: 'r_start_rags',
        resultItem: ITEMS_DATABASE.find(i => i.id === 'a_body_0')!,
        materials: [{ name: 'Шкура', count: 1 }],
        goldCost: 10
    },

    // --- CONSUMABLES ---
    {
        id: 'r_regen_pot',
        resultItem: ITEMS_DATABASE.find(i => i.id === 'pot_hp_s')!,
        materials: [{ name: 'Шкура', count: 2 }, { name: 'Корень', count: 1 }],
        goldCost: 30
    },
    {
        id: 'r_sta_pot',
        resultItem: ITEMS_DATABASE.find(i => i.id === 'pot_sta')!,
        materials: [{ name: 'Корень', count: 2 }, { name: 'Перо', count: 1 }],
        goldCost: 40
    }
];

// --- UTILS & DATA FOR GAME LOGIC ---

export const MATERIALS = ITEMS_DATABASE.filter(i => i.type === ItemType.MATERIAL);

export const DAILY_QUEST_POOL: Partial<Quest>[] = [
    { title: 'Утренняя зарядка', description: 'Выполнить зарядку 15 минут.', reputationType: ReputationType.DISCIPLINE, difficulty: 1, rarity: ItemRarity.COMMON },
    { title: 'Фокусировка', description: 'Работать 1 час не отвлекаясь.', reputationType: ReputationType.DISCIPLINE, difficulty: 2, rarity: ItemRarity.UNCOMMON },
    { title: 'Доброе дело', description: 'Помочь кому-то.', reputationType: ReputationType.HEROISM, difficulty: 1, rarity: ItemRarity.COMMON },
    { title: 'Идея дня', description: 'Записать одну новую идею.', reputationType: ReputationType.CREATIVITY, difficulty: 1, rarity: ItemRarity.COMMON },
];

export const WEEKLY_QUEST_POOL: Partial<Quest>[] = [
    { title: 'Книжный червь', description: 'Прочитать 50 страниц.', reputationType: ReputationType.CREATIVITY, difficulty: 3, rarity: ItemRarity.RARE },
    { title: 'Марафонец', description: 'Пройти 50 000 шагов за неделю.', reputationType: ReputationType.DISCIPLINE, difficulty: 4, rarity: ItemRarity.EPIC },
    { title: 'Волонтер', description: 'Потратить 2 часа на благотворительность.', reputationType: ReputationType.HEROISM, difficulty: 3, rarity: ItemRarity.RARE },
];

export const ONETIME_QUEST_POOL: Partial<Quest>[] = [
    { title: 'Первый шаг', description: 'Выполнить первое ежедневное задание.', reputationType: ReputationType.DISCIPLINE, difficulty: 1, rarity: ItemRarity.COMMON },
    { title: 'Исследователь', description: 'Посетить подземелье.', reputationType: ReputationType.HEROISM, difficulty: 1, rarity: ItemRarity.COMMON },
    { title: 'Коллекционер', description: 'Найти предмет редкого качества.', reputationType: ReputationType.CREATIVITY, difficulty: 2, rarity: ItemRarity.UNCOMMON },
];

export const EVENT_DEFINITIONS = [
    {
        dateMatch: (d: Date) => d.getMonth() === 0 && d.getDate() === 1, // New Year
        quest: { title: 'Новое начало', description: 'Записать цели на год.', reputationType: ReputationType.CREATIVITY, difficulty: 1, rarity: ItemRarity.LEGENDARY },
        rewardItem: ITEMS_DATABASE.find(i => i.id === 'acc_ring_5')
    }
];

// --- DUNGEONS & MOBS ---

export const DUNGEONS: DungeonInfo[] = [
  { id: 'd_forest', name: 'Темный Лес', biome: DungeonBiome.FOREST, minLevel: 1, maxLevel: 5, description: 'Лес, где деревья шепчут имена павших.' },
  { id: 'd_cave', name: 'Сырая Пещера', biome: DungeonBiome.CAVE, minLevel: 3, maxLevel: 8, description: 'Глубокие туннели, кишащие гоблинами.' },
  { id: 'd_swamp', name: 'Гнилое Болото', biome: DungeonBiome.SWAMP, minLevel: 7, maxLevel: 12, description: 'Топи, затягивающие неосторожных.', effectDescription: 'Шанс промаха +20%' },
  { id: 'd_desert', name: 'Пески Времени', biome: DungeonBiome.DESERT, minLevel: 12, maxLevel: 18, description: 'Пустыня, где солнце сжигает заживо.' },
  { id: 'd_ice', name: 'Ледяной Пик', biome: DungeonBiome.ICE, minLevel: 18, maxLevel: 25, description: 'Холод пробирает до костей.', effectDescription: 'Урон по игроку +10%' },
  { id: 'd_necro', name: 'Некрополь', biome: DungeonBiome.NECROPOLIS, minLevel: 25, maxLevel: 35, description: 'Город мертвых.', effectDescription: 'Враги наносят +10% урона' },
  { id: 'd_sky', name: 'Небесная Цитадель', biome: DungeonBiome.SKY, minLevel: 35, maxLevel: 45, description: 'Парящий замок древних магов.' },
  { id: 'd_hell', name: 'Пекло', biome: DungeonBiome.HELL, minLevel: 45, maxLevel: 60, description: 'Обитель демонов.', effectDescription: 'Периодический урон огнем' },
];

export const MOBS_BY_BIOME: Record<DungeonBiome, string[]> = {
    [DungeonBiome.FOREST]: ['Волк', 'Разбойник', 'Медведь', 'Энт'],
    [DungeonBiome.CAVE]: ['Гоблин', 'Летучая мышь', 'Тролль', 'Каменный голем'],
    [DungeonBiome.SWAMP]: ['Слизень', 'Болотная ведьма', 'Утопец', 'Гидра'],
    [DungeonBiome.DESERT]: ['Скорпион', 'Мумия', 'Песчаный червь', 'Джинн'],
    [DungeonBiome.ICE]: ['Снежный волк', 'Йети', 'Ледяной голем', 'Призрак'],
    [DungeonBiome.NECROPOLIS]: ['Скелет', 'Зомби', 'Вампир', 'Лич'],
    [DungeonBiome.SKY]: ['Гарпия', 'Грифон', 'Элементаль воздуха', 'Ангел'],
    [DungeonBiome.HELL]: ['Бес', 'Цербер', 'Демон', 'Архидемон'],
    [DungeonBiome.CHAOS]: ['Тень', 'Кошмар', 'Безумие'],
    [DungeonBiome.AETHER]: ['Дух', 'Фантом', 'Мистик']
};

export interface BossTemplate {
    name: string;
    ability: 'REGEN' | 'CRITICAL' | 'VAMPIRISM';
}

export const BOSS_REGISTRY: Record<DungeonBiome, BossTemplate> = {
    [DungeonBiome.FOREST]: { name: 'Древний Энт', ability: 'REGEN' },
    [DungeonBiome.CAVE]: { name: 'Король Троллей', ability: 'CRITICAL' },
    [DungeonBiome.SWAMP]: { name: 'Гидра', ability: 'REGEN' },
    [DungeonBiome.DESERT]: { name: 'Повелитель Песков', ability: 'VAMPIRISM' },
    [DungeonBiome.ICE]: { name: 'Ледяной Великан', ability: 'CRITICAL' },
    [DungeonBiome.NECROPOLIS]: { name: 'Архилич', ability: 'VAMPIRISM' },
    [DungeonBiome.SKY]: { name: 'Громовержец', ability: 'CRITICAL' },
    [DungeonBiome.HELL]: { name: 'Балор', ability: 'CRITICAL' },
    [DungeonBiome.CHAOS]: { name: 'Воплощение Хаоса', ability: 'VAMPIRISM' },
    [DungeonBiome.AETHER]: { name: 'Пустотный Странник', ability: 'REGEN' },
};

export const MOB_RARITY_CONFIG: Record<ItemRarity, { xp: number, hpMult: number, atkMult: number }> = {
    [ItemRarity.COMMON]: { xp: 1, hpMult: 1, atkMult: 1 },
    [ItemRarity.UNCOMMON]: { xp: 1.5, hpMult: 1.3, atkMult: 1.2 },
    [ItemRarity.RARE]: { xp: 3, hpMult: 1.8, atkMult: 1.5 },
    [ItemRarity.EPIC]: { xp: 6, hpMult: 3.0, atkMult: 2.0 },
    [ItemRarity.LEGENDARY]: { xp: 15, hpMult: 5.0, atkMult: 3.0 }
};

export const generateMob = (biome: DungeonBiome, floor: number, isBoss: boolean, isElite: boolean, difficultyMult: number): Mob => {
    // 1. Determine Identity (Boss check first for floor 10 multiples)
    const isMajorBoss = isBoss && floor % 10 === 0;
    
    let name = '';
    let specialAbility = undefined;

    if (isMajorBoss) {
        const bossTemplate = BOSS_REGISTRY[biome] || BOSS_REGISTRY[DungeonBiome.FOREST];
        name = `ВЕЛИКИЙ ${bossTemplate.name}`;
        specialAbility = bossTemplate.ability;
    } else {
        const names = MOBS_BY_BIOME[biome] || MOBS_BY_BIOME[DungeonBiome.FOREST];
        const baseName = names[Math.floor(Math.random() * names.length)];
        name = isBoss ? `БОСС: ${baseName}` : baseName;
    }

    // 2. Determine Rarity
    let rarity = ItemRarity.COMMON;
    if (isElite) rarity = ItemRarity.UNCOMMON;
    if (isBoss) rarity = ItemRarity.RARE;
    if (isMajorBoss) rarity = ItemRarity.LEGENDARY; // Major bosses are always Legendary+
    
    const config = MOB_RARITY_CONFIG[rarity];
    const level = floor;
    
    // HP Formula: (Base 30 + Floor * 10) * Rarity * Diff
    // Major bosses get an additional 2x HP buffer
    const majorBossHpMult = isMajorBoss ? 2.0 : 1.0;
    const hp = Math.floor((30 + floor * 10) * config.hpMult * majorBossHpMult * difficultyMult);
    const maxHp = hp;
    
    // Atk Formula: (Base 3 + Floor * 1.5) * Rarity * Diff
    const atk = Math.floor((3 + floor * 1.5) * config.atkMult * difficultyMult);
    
    // Def Formula: Floor * 1
    const def = Math.floor(floor * 1);

    return {
        id: generateUUID(),
        name,
        level,
        hp,
        maxHp,
        atk,
        def,
        rarity,
        biome,
        drops: [],
        dropChance: GAME_BALANCE.DROP_RATES.BASE * (isBoss ? 5 : 1) * (isElite ? 2 : 1),
        isBoss,
        specialAbility
    };
};

export const generateRandomItem = (level: number, forceRarity?: ItemRarity): Item => {
    // Filter items around the level (+- 5 levels)
    let candidates = ITEMS_DATABASE.filter(i => Math.abs(i.levelReq - level) <= 5);
    
    if (forceRarity) {
        candidates = candidates.filter(i => i.rarity === forceRarity);
    }
    
    // If no exact match, widen search or fallback
    if (candidates.length === 0) {
        candidates = ITEMS_DATABASE.filter(i => i.levelReq <= level);
    }
    if (candidates.length === 0) candidates = ITEMS_DATABASE;

    // Weight by rarity if not forced? 
    // For now simple random
    const base = candidates[Math.floor(Math.random() * candidates.length)];
    
    return {
        ...base,
        id: generateUUID() // New Instance ID
    };
};

export const generateLootForSource = (character: Character, floor: number, mobRarity: ItemRarity, biome?: DungeonBiome): Item | null => {
    let dropChance = GAME_BALANCE.DROP_RATES.BASE;
    if (mobRarity === ItemRarity.UNCOMMON) dropChance += GAME_BALANCE.DROP_RATES.ELITE_BONUS;
    if (mobRarity === ItemRarity.RARE) dropChance += 0.3;
    if (mobRarity === ItemRarity.EPIC) dropChance += 0.5;
    if (mobRarity === ItemRarity.LEGENDARY) dropChance = 1.0;

    // Luck Bonus
    dropChance += (character.stats.dex / GAME_BALANCE.DROP_RATES.LUCK_FACTOR);

    if (Math.random() > dropChance) return null;

    // Determine rarity of loot
    let lootRarity = ItemRarity.COMMON;
    const roll = Math.random() * 100;
    
    // Simple rarity table based on floor/luck could go here, for now use mob rarity as cap or guide
    if (roll > 95) lootRarity = ItemRarity.LEGENDARY;
    else if (roll > 85) lootRarity = ItemRarity.EPIC;
    else if (roll > 60) lootRarity = ItemRarity.RARE;
    else if (roll > 30) lootRarity = ItemRarity.UNCOMMON;
    
    // Cap loot rarity by mob rarity? Maybe not strict cap, but bias.
    // Let's just generate random item around floor level
    return generateRandomItem(floor, lootRarity);
};