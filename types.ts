export enum ClassType {
  WARRIOR = 'Воин',
  MAGE = 'Маг',
  SCOUT = 'Разведчик',
  HEALER = 'Целитель'
}

export enum ItemRarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary'
}

export enum ItemType {
  WEAPON = 'Оружие',
  HEAD = 'Голова',
  BODY = 'Тело',
  HANDS = 'Кисти',
  LEGS = 'Ноги',
  RING = 'Кольцо',
  AMULET = 'Амулет',
  BELT = 'Пояс',
  POTION = 'Зелье',
  SCROLL = 'Свиток',
  FOOD = 'Еда',
  MATERIAL = 'Материал'
}

export enum MaterialType {
  BIO = 'BIO',
  MINERAL = 'MINERAL',
  MAGIC = 'MAGIC',
  ARTIFACT = 'ARTIFACT'
}

export enum ReputationType {
  HEROISM = 'Героизм',
  DISCIPLINE = 'Дисциплина',
  CREATIVITY = 'Творчество'
}

export enum DungeonBiome {
  FOREST = 'Лес',
  CAVE = 'Пещера',
  SWAMP = 'Болото',
  DESERT = 'Пустыня',
  ICE = 'Ледник',
  NECROPOLIS = 'Некрополь',
  SKY = 'Небеса',
  HELL = 'Преисподняя',
  CHAOS = 'Хаос',
  AETHER = 'Эфир'
}

export enum QuestCategory {
  DAILY = 'Ежедневное',
  WEEKLY = 'Еженедельное',
  ONETIME = 'Разовое',
  EVENT = 'Событие'
}

export interface Stats {
  str: number;
  dex: number;
  int: number;
  vit: number;
}

export interface Buff {
  name: string;
  duration: number; // turns
  effect: (stats: Stats) => Stats;
  description: string;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  price: number;
  levelReq: number;
  classReq?: ClassType;
  stats?: Partial<Stats>;
  effect?: string; 
  healAmount?: number;
  buff?: Buff;
  icon?: string;
  materialType?: MaterialType;
  description?: string;
}

export interface Recipe {
  id: string;
  resultItem: Item;
  materials: { name: string; count: number }[];
  goldCost: number;
}

export interface JournalEntry {
  id: string;
  date: number;
  text: string;
  mood: 'Inspired' | 'Tired' | 'Neutral' | 'Regret';
}

export interface Settings {
  fontSize: 'normal' | 'large';
  highContrast: boolean;
}

export interface Equipment {
  weapon: Item | null;
  head: Item | null;
  body: Item | null;
  hands: Item | null;
  legs: Item | null;
  ring: Item | null;
  amulet: Item | null;
  belt: Item | null;
}

export interface Character {
  name: string;
  classType: ClassType;
  level: number;
  currentExp: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  gold: number;
  inventory: Item[];
  inventorySlots: number;
  equipment: Equipment;
  reputation: {
    [key in ReputationType]: number;
  };
  /** 0-100 */
  honesty: number; 
  dailyStreak: number;
  journal: JournalEntry[];
  settings: Settings;
  unlockedRecipes: string[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  reputationType: ReputationType;
  difficulty: number; // 1-6
  rarity: ItemRarity;
  rewardGold: number;
  rewardExp: number;
  rewardItem?: Item;
  completed: boolean;
  completedToday?: boolean;
  lastCompletedAt?: number | null;
  cooldownMs?: number;
}

export interface DungeonInfo {
  id: string;
  name: string;
  biome: DungeonBiome;
  minLevel: number;
  maxLevel: number;
  description: string;
  effectDescription?: string;
}

export interface Mob {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  rarity: ItemRarity;
  biome: DungeonBiome;
  drops: string[]; // Drop keys
  dropChance: number;
  isBoss?: boolean;
  specialAbility?: string;
}

export interface DungeonState {
  currentMob: Mob | null;
  bossDefeated: Record<string, boolean>; // e.g. "forest_5": true
  activeBuffs: Buff[];
  activeDebuffs: Buff[];
}

export interface ShopState {
  items: Item[];
  discounts: Record<string, number>; // itemId -> discount percent
  lastUpdate: number;
  visitStreak: number;
}

export interface GameState {
  version: '1.0';
  character: Character | null;
  lastDailyReset: number;
  lastWeeklyReset: number;
  shopState: ShopState;
  activeQuests: Quest[];
  completedQuestIds: string[];
  dungeonFloor: number;
  currentDungeonId: string | null;
  dungeonState: DungeonState;
}