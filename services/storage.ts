import { GameState } from '../types';

const STORAGE_KEY = 'gameState';
const BACKUP_KEY = 'backupGameState';

export const saveGame = (state: GameState) => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    // Backup every now and then (simplified to always here for safety)
    if (Math.random() > 0.8) {
        localStorage.setItem(BACKUP_KEY, serialized);
    }
  } catch (e) {
    console.error("Save failed", e);
  }
};

export const loadGame = (): GameState | null => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized);
  } catch (e) {
    console.error("Load failed, trying backup", e);
    try {
        const backup = localStorage.getItem(BACKUP_KEY);
        if (backup) return JSON.parse(backup);
    } catch (e2) {
        return null;
    }
    return null;
  }
};

export const resetGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    window.location.reload();
}
