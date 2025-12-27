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
  materialType?: 'BIO' | 'MINERAL' | 'MAGIC' | 'ARTIFACT';
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
  honesty: number; // 0-100
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
  rewardItem?: Item; // Fixed reward for specific quests
  completed: boolean;
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

export interface GameState {
  character: Character | null;
  lastDailyReset: number;
  lastWeeklyReset: number;
  lastShopUpdate: number;
  shopItems: Item[]; 
  activeQuests: Quest[];
  completedQuestIds: string[];
  dungeonFloor: number;
  currentDungeonId: string | null;
  shopVisitStreak: number; 
}
