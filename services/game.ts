import { GameState, QuestCategory, ItemRarity, Item, ItemType, Character, Quest } from '../types';
import { DAILY_QUEST_POOL, WEEKLY_QUEST_POOL, EVENT_DEFINITIONS, generateRandomItem, GAME_BALANCE, generateUUID } from '../constants';

export const addItemToInventory = (character: Character, newItem: Item, count: number = 1): Character => {
    const newChar = { ...character };
    const newInv = [...newChar.inventory];
    
    if (newItem.stackable) {
        const existingIdx = newInv.findIndex(i => i.name === newItem.name && i.type === newItem.type);
        if (existingIdx !== -1) {
            // Item exists, just add amount
            newInv[existingIdx] = { 
                ...newInv[existingIdx], 
                amount: (newInv[existingIdx].amount || 1) + count 
            };
        } else {
            // New item, check slots
             if (newInv.length < character.inventorySlots) {
                newInv.push({ ...newItem, id: generateUUID(), amount: count });
             } else {
                 // Inventory full
                 return character; 
             }
        }
    } else {
        // Non-stackable: Add individual items
        for(let i=0; i<count; i++) {
            if (newInv.length < character.inventorySlots) {
                newInv.push({ ...newItem, id: generateUUID(), amount: 1 });
            } else {
                break; // Stop if full
            }
        }
    }
    
    newChar.inventory = newInv;
    return newChar;
};

export const processGameTick = (state: GameState): GameState => {
    const now = new Date();
    let hasUpdates = false;
    
    const newState = { 
        ...state, 
        character: state.character ? { ...state.character } : null 
    };

    if (!newState.character) return newState;

    // --- Quest Reset & Generation Logic ---
    const lastDaily = new Date(newState.lastDailyReset);
    const lastWeekly = new Date(newState.lastWeeklyReset || 0);

    const isNewDay = now.getDate() !== lastDaily.getDate() || now.getMonth() !== lastDaily.getMonth() || now.getFullYear() !== lastDaily.getFullYear();
    const daysSinceWeekly = (now.getTime() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24);
    const isNewWeek = (now.getDay() === 1 && daysSinceWeekly > 1) || daysSinceWeekly > 7;

    let newActiveQuests = [...newState.activeQuests];
    let dailyResetTime = newState.lastDailyReset;
    let weeklyResetTime = newState.lastWeeklyReset || 0;

    const hasDailies = newActiveQuests.some(q => q.category === QuestCategory.DAILY);
    const hasWeeklies = newActiveQuests.some(q => q.category === QuestCategory.WEEKLY);

    // DAILY
    if (isNewDay || !hasDailies) {
        if (isNewDay && hasDailies) {
             const uncompletedDailies = newActiveQuests.filter(q => q.category === QuestCategory.DAILY && !q.completed).length;
             if (uncompletedDailies >= 5) {
                 newState.character.dailyStreak = 0;
                 // No punishment for honesty to avoid churn
             }
        }
        
        newActiveQuests = newActiveQuests.filter(q => q.category !== QuestCategory.DAILY);
        
        // Exponential scaling for rewards
        // Base * Scaling^Level
        const scaling = Math.pow(GAME_BALANCE.SCALING.QUEST_GOLD_SCALING, newState.character.level);

        for (let i = 0; i < 10; i++) {
            const template = DAILY_QUEST_POOL[Math.floor(Math.random() * DAILY_QUEST_POOL.length)];
            
            newActiveQuests.push({
                ...template,
                id: `d_${Date.now()}_${i}`,
                category: QuestCategory.DAILY,
                rewardGold: Math.floor(50 * scaling), 
                rewardExp: Math.floor(20 * scaling),
                completed: false
            } as Quest);
        }
        dailyResetTime = Date.now();
        hasUpdates = true;
    }

    // WEEKLY
    if (isNewWeek || !hasWeeklies) {
        newActiveQuests = newActiveQuests.filter(q => q.category !== QuestCategory.WEEKLY);
        const scaling = Math.pow(GAME_BALANCE.SCALING.QUEST_GOLD_SCALING, newState.character.level);

        for (let i = 0; i < 5; i++) {
            const template = WEEKLY_QUEST_POOL[Math.floor(Math.random() * WEEKLY_QUEST_POOL.length)];
            
            newActiveQuests.push({
                ...template,
                id: `w_${Date.now()}_${i}`,
                category: QuestCategory.WEEKLY,
                rewardGold: Math.floor(200 * scaling),
                rewardExp: Math.floor(100 * scaling),
                rewardItem: generateRandomItem(newState.character.level, ItemRarity.UNCOMMON),
                completed: false
            } as Quest);
        }
        weeklyResetTime = Date.now();
        hasUpdates = true;
    }

    // EVENTS
    EVENT_DEFINITIONS.forEach((evt, i) => {
        if (evt.dateMatch(now)) {
            const questId = `evt_${i}`;
            const isActive = newActiveQuests.some(q => q.id === questId);
            const isCompleted = newState.completedQuestIds.includes(questId);
            
            if (!isActive && !isCompleted) {
                newActiveQuests.push({
                    ...evt.quest,
                    id: questId,
                    category: QuestCategory.EVENT,
                    rewardGold: 1000,
                    rewardExp: 500,
                    rewardItem: evt.rewardItem,
                    completed: false
                } as Quest);
                hasUpdates = true;
            }
        }
    });

    if (hasUpdates) {
        newState.activeQuests = newActiveQuests;
        newState.lastDailyReset = dailyResetTime;
        newState.lastWeeklyReset = weeklyResetTime;
    }

    return newState;
};