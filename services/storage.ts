import { GameState, ItemType } from '../types';
import { ITEMS_DATABASE } from '../constants';

const STORAGE_KEY = 'gameState';
const BACKUP_KEY = 'backupGameState';
const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

let lastBackupTime = 0;

export const isValidGameState = (state: any): state is GameState => {
    if (!state || typeof state !== 'object') return false;
    
    // Check critical root properties
    if (state.version !== '1.0' && state.version !== '1.1') return false;
    if (!state.character || typeof state.character !== 'object') return false;

    // Check critical character properties
    const char = state.character;
    if (typeof char.hp !== 'number' || typeof char.maxHp !== 'number') return false;
    if (!char.stats || typeof char.stats !== 'object') return false;
    if (!Array.isArray(char.inventory)) return false;
    if (!char.reputation || typeof char.reputation !== 'object') return false;

    return true;
}

export const migrateState = (state: any): GameState => {
    if (!state) return state;
    
    let newState = { ...state };

    // Migration for pre-1.0 or missing version
    if (!newState.version) {
        newState = {
            ...newState,
            version: '1.0',
            shopState: newState.shopState || { items: [], discounts: {}, lastUpdate: 0, visitStreak: 0 },
            dungeonState: newState.dungeonState || { currentMob: null, bossDefeated: {}, activeBuffs: [], activeDebuffs: [] },
            // Ensure quest arrays exist
            activeQuests: newState.activeQuests || [],
            completedQuestIds: newState.completedQuestIds || [],
        };
    }

    // Migration 1.0 -> 1.1 (Stackable items, amount)
    if (newState.version === '1.0') {
        const char = { ...newState.character };
        if (char && char.inventory) {
             // 1. Add amount to all items
             // 2. Add stackable flag based on type
             const newInventory = char.inventory.map((item: any) => {
                 const isStackable = [ItemType.MATERIAL, ItemType.POTION, ItemType.SCROLL, ItemType.FOOD].includes(item.type);
                 return { ...item, amount: item.amount || 1, stackable: isStackable };
             });

             // 3. Compress inventory (merge duplicates)
             const mergedInventory: any[] = [];
             newInventory.forEach((item: any) => {
                 if (item.stackable) {
                     const existing = mergedInventory.find((i: any) => i.name === item.name && i.type === item.type);
                     if (existing) {
                         existing.amount += item.amount;
                     } else {
                         mergedInventory.push(item);
                     }
                 } else {
                     mergedInventory.push(item);
                 }
             });
             char.inventory = mergedInventory;
        }
        
        // Ensure regen exists
        if (typeof char.hpRegen === 'undefined') char.hpRegen = 0;

        newState.character = char;
        newState.version = '1.1';
    }
    
    return newState as GameState;
};

export const saveGame = (state: GameState) => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    
    const now = Date.now();
    if (now - lastBackupTime > BACKUP_INTERVAL) {
        localStorage.setItem(BACKUP_KEY, serialized);
        lastBackupTime = now;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.error("Local Storage is full. Unable to save progress.");
        // Trim journal if full
        if (state.character && state.character.journal.length > 50) {
            const trimmedState = {
                ...state,
                character: {
                    ...state.character,
                    journal: state.character.journal.slice(0, 50)
                }
            };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedState));
            } catch(ignored) {}
        }
    } else {
        console.error("Save failed", e);
    }
  }
};

export const loadGame = (): GameState | null => {
  const parse = (str: string | null) => {
      if (!str) return null;
      try {
          return JSON.parse(str);
      } catch {
          return null;
      }
  };

  let state = parse(localStorage.getItem(STORAGE_KEY));
  
  // Validate loaded state. If invalid, try backup.
  if (!state || !isValidGameState(migrateState({ ...state }))) {
      console.warn("Main save invalid or corrupt, trying backup...");
      state = parse(localStorage.getItem(BACKUP_KEY));
  }

  // Double check backup
  if (state) {
      const migrated = migrateState(state);
      if (isValidGameState(migrated)) {
          return migrated;
      }
  }
  
  return null;
};

export const clearCorruptedSave = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    window.location.reload();
};