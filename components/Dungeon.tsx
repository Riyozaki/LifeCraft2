import React, { useState, useEffect, useRef } from 'react';
import { GameState, ItemType, Item, DungeonInfo, DungeonBiome, Mob } from '../types';
import { HEALTH_POTION, XP_TO_LEVEL, generateLootForSource, DUNGEONS, MOBS_BY_BIOME, generateMob } from '../constants';

interface Props {
  gameState: GameState;
  updateState: (s: Partial<GameState>) => void;
  addNotification: (msg: string) => void;
  goHome: () => void;
}

interface CombatLog {
    text: string;
    color: string;
}

const Dungeon: React.FC<Props> = ({ gameState, updateState, addNotification, goHome }) => {
  const [inSelection, setInSelection] = useState(!gameState.currentDungeonId);
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Local turn state (visual only, logic is synced with effect/state if needed, but for now simple local turn)
  const [turn, setTurn] = useState<'PLAYER' | 'ENEMY' | 'WIN' | 'LOSE'>('PLAYER');
  
  // Shortcuts
  const currentDungeon = DUNGEONS.find(d => d.id === gameState.currentDungeonId);
  const mob = gameState.dungeonState.currentMob;
  const playerHp = gameState.character?.hp || 0;

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Init Encounter if needed
  useEffect(() => {
    if (gameState.currentDungeonId && !gameState.dungeonState.currentMob) {
        startEncounter();
        setInSelection(false);
    } else if (gameState.currentDungeonId && gameState.dungeonState.currentMob) {
        setInSelection(false);
        // Resume combat...
    } else {
        setInSelection(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentDungeonId, gameState.dungeonState.currentMob]);

  const addLog = (text: string, color: string = 'text-gray-300') => {
    setLogs(prev => [...prev.slice(-4), { text, color }]);
  };

  const selectDungeon = (dungeonId: string) => {
      const dungeon = DUNGEONS.find(d => d.id === dungeonId);
      if (dungeon && gameState.character!.level >= dungeon.minLevel) {
          updateState({ 
              currentDungeonId: dungeonId, 
              dungeonFloor: 1,
              dungeonState: { ...gameState.dungeonState, currentMob: null } // Clear mob to trigger generation
          });
      } else {
          addNotification("Уровень слишком мал!");
      }
  };

  const startEncounter = () => {
    if (!currentDungeon) return;

    const floor = gameState.dungeonFloor;
    const isBoss = floor % 5 === 0;
    const isElite = !isBoss && Math.random() > 0.8;

    const newMob = generateMob(currentDungeon.biome, floor, isBoss, isElite);
    
    updateState({
        dungeonState: {
            ...gameState.dungeonState,
            currentMob: newMob
        }
    });
    
    setTurn('PLAYER');
    addLog(`Этаж ${floor}: ${newMob.name} (Ур.${newMob.level})`, 'text-[#e6c35c]');
  };

  const playerAttack = () => {
    if (turn !== 'PLAYER' || !mob) return;
    
    // Calculation
    const char = gameState.character!;
    let baseStr = char.stats.str;
    Object.values(char.equipment).forEach((val) => {
        const item = val as Item | null;
        if (item?.stats?.str) baseStr += item.stats.str;
    });

    const playerATK = baseStr * 2;
    const rawDmg = Math.floor(playerATK); // Simplified skill bonus for now
    const finalDmg = Math.max(1, rawDmg - mob.def);

    // Crit
    let dex = char.stats.dex;
    Object.values(char.equipment).forEach((val) => { 
        const item = val as Item | null;
        if (item?.stats?.dex) dex += item.stats.dex; 
    });
    const critChance = 5 + (dex / 5);
    const isCrit = Math.random() * 100 < critChance;
    
    let actualDmg = isCrit ? Math.floor(finalDmg * 2) : finalDmg;
    
    const newMobHp = Math.max(0, mob.hp - actualDmg);
    
    // Update Mob State
    updateState({
        dungeonState: {
            ...gameState.dungeonState,
            currentMob: { ...mob, hp: newMobHp }
        }
    });

    if (isCrit) addLog(`КРИТИЧЕСКИЙ УДАР! ${actualDmg} урона!`, 'text-red-400');
    else addLog(`Вы наносите ${actualDmg} урона.`);

    if (newMobHp === 0) {
        handleWin(mob);
    } else {
        setTurn('ENEMY');
        setTimeout(() => enemyTurn(newMobHp), 1000);
    }
  };

  const enemyTurn = (currentMobHp: number) => {
    if (!mob) return; // Should not happen if state persisted correctly
    
    // Mob Attack
    const char = gameState.character!;
    let vit = char.stats.vit;
    Object.values(char.equipment).forEach((val) => { 
        const item = val as Item | null;
        if (item?.stats?.vit) vit += item.stats.vit; 
    });
    
    const mitigation = Math.floor(vit / 2);
    const dmgToPlayer = Math.max(1, mob.atk - mitigation);
    
    const newPlayerHp = Math.max(0, char.hp - dmgToPlayer);
    
    updateState({
        character: { ...char, hp: newPlayerHp }
    });

    addLog(`${mob.name} атакует на ${dmgToPlayer}!`, 'text-red-500');

    if (newPlayerHp === 0) {
        setTurn('LOSE');
    } else {
        setTurn('PLAYER');
    }
  };

  const handleWin = (defeatedMob: Mob) => {
    setTurn('WIN');
    const floor = gameState.dungeonFloor;
    
    const xpGain = defeatedMob.level * 20;
    const goldGain = defeatedMob.level * 15;
    
    const sourceType = defeatedMob.isBoss ? 'BOSS' : (defeatedMob.rarity === 'Rare' ? 'ELITE' : 'MOB'); // Simplified check
    const loot = generateLootForSource(gameState.character!, floor, sourceType, currentDungeon?.biome);

    addLog(`Победа! +${goldGain}з, +${xpGain}xp`, 'text-[#e6c35c]');
    if (loot) addLog(`Найдено: ${loot.icon || ''} ${loot.name}`, 'text-[#8be9fd]');

    const char = { ...gameState.character! };
    char.gold += goldGain;
    char.currentExp += xpGain;
    
    const reqXp = XP_TO_LEVEL(char.level);
    if (char.currentExp >= reqXp) {
        char.level++;
        char.currentExp -= reqXp;
        char.maxHp += 10;
        // Auto heal on level up?
        char.hp = char.maxHp; 
        addLog(`УРОВЕНЬ ПОВЫШЕН! Теперь ${char.level}`, 'text-[#50fa7b]');
    }

    if (loot && char.inventory.length < char.inventorySlots) {
        char.inventory.push(loot);
    }

    if (defeatedMob.isBoss) {
        // Record boss defeat
        const bossKey = `${gameState.currentDungeonId}_${floor}`;
        gameState.dungeonState.bossDefeated[bossKey] = true;
    }

    setTimeout(() => {
        updateState({ 
            character: char, 
            dungeonFloor: floor + 1,
            dungeonState: { ...gameState.dungeonState, currentMob: null } // Clear mob
        });
        setTurn('PLAYER');
    }, 2000);
  };

  const usePotion = () => {
    if (turn !== 'PLAYER') return;
    const char = gameState.character!;
    const potionIdx = char.inventory.findIndex(i => i.type === ItemType.POTION);
    
    if (potionIdx === -1) {
        addLog("Зелья закончились!", "text-gray-500");
        return;
    }

    const potionItem = char.inventory[potionIdx];
    let quality = 1;
    if (potionItem.rarity === 'Rare') quality = 2;
    if (potionItem.rarity === 'Epic') quality = 3;

    const baseHeal = potionItem.healAmount || 50;
    const healAmount = Math.floor(baseHeal + (char.level * quality) / 2);

    const newHp = Math.min(char.maxHp, char.hp + healAmount);
    
    const newInv = [...char.inventory];
    newInv.splice(potionIdx, 1);
    
    updateState({ character: { ...char, inventory: newInv, hp: newHp } });
    addLog(`Выпито зелье. +${healAmount} HP.`, "text-green-400");
    setTurn('ENEMY');
    // Using current mob hp from state since it hasn't changed
    setTimeout(() => enemyTurn(mob ? mob.hp : 0), 1000);
  };

  const handleRun = () => {
    updateState({ currentDungeonId: null, dungeonState: { ...gameState.dungeonState, currentMob: null } });
    goHome();
  };

  if (inSelection) {
      return (
          <div className="h-full bg-black/80 p-6 overflow-y-auto">
              <h2 className="text-[#e6c35c] text-xl mb-6 text-center uppercase tracking-widest text-shadow">Врата Подземелий</h2>
              <div className="grid gap-4 max-w-2xl mx-auto">
                  {DUNGEONS.map(d => (
                      <button 
                        key={d.id}
                        onClick={() => selectDungeon(d.id)}
                        disabled={gameState.character!.level < d.minLevel}
                        className={`p-4 border-2 text-left relative overflow-hidden group transition-all ${gameState.character!.level >= d.minLevel ? 'border-gray-600 hover:border-[#e6c35c] bg-[#2b2b2b]' : 'border-red-900 bg-black opacity-50 cursor-not-allowed'}`}
                      >
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-[#e6c35c] font-bold">{d.name}</span>
                              <span className="text-xs text-gray-400">Мин. уровень: {d.minLevel}</span>
                          </div>
                          <div className="text-xs text-gray-300 mb-2 italic font-sans">{d.description}</div>
                      </button>
                  ))}
              </div>
              <div className="text-center mt-8">
                <button onClick={goHome} className="pixel-btn px-8 text-red-400 border-red-400 hover:bg-red-900">В ГОРОД</button>
              </div>
          </div>
      );
  }

  if (turn === 'LOSE') {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-black">
              <h1 className="text-4xl text-[#d9534f] mb-4 shake-anim">ПАЛ В БОЮ</h1>
              <p className="mb-8 text-gray-400">Твое тело осталось в {currentDungeon?.name}</p>
              <button 
                onClick={() => {
                    const char = { ...gameState.character! };
                    char.hp = Math.floor(char.maxHp / 2); 
                    updateState({ 
                        character: char, 
                        dungeonFloor: 1, 
                        currentDungeonId: null,
                        dungeonState: { ...gameState.dungeonState, currentMob: null } 
                    });
                    goHome();
                }}
                className="pixel-btn text-[#d9534f] border-[#d9534f] hover:bg-red-900"
              >
                  ВОСКРЕСНУТЬ (-1 Этаж)
              </button>
          </div>
      )
  }

  if (!mob) return <div>Loading encounter...</div>;

  return (
    <div className={`flex flex-col h-full bg-black/50 relative overflow-hidden ${currentDungeon?.biome === DungeonBiome.SWAMP ? 'fog-anim' : ''}`}>
      {/* Top Bar */}
      <div className="flex justify-between p-3 bg-[#1a181e] border-b-2 border-black z-10 relative">
        <div className="text-xs text-gray-300">{currentDungeon?.name} — Этаж {gameState.dungeonFloor}</div>
        <button onClick={handleRun} className="text-[10px] text-[#d9534f] hover:text-white uppercase tracking-wider">Покинуть бой</button>
      </div>

      {/* Combat Visuals */}
      <div className="flex-1 relative flex items-center justify-between px-8 py-4 z-10">
        <div className={`text-center transition-transform duration-300 ${turn === 'PLAYER' ? 'scale-110' : ''}`}>
            <div className="w-20 h-20 bg-[#2a2630] border-2 border-blue-500 mb-3 mx-auto flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">🧙‍♂️</div>
            <div className="w-32 bg-[#1a181e] h-3 mx-auto border border-gray-600">
                <div className="bg-[#50fa7b] h-full transition-all duration-300" style={{ width: `${(playerHp / gameState.character!.maxHp) * 100}%` }}></div>
            </div>
            <p className="text-[10px] mt-1 text-gray-300 font-mono">{playerHp}/{gameState.character!.maxHp}</p>
        </div>

        <div className="text-[#e6c35c] opacity-20 text-4xl font-bold">VS</div>

        <div className={`text-center transition-transform duration-300 ${turn === 'ENEMY' ? 'scale-110' : ''}`}>
             <div className="w-20 h-20 bg-[#2a2630] border-2 border-[#d9534f] mb-3 mx-auto flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(217,83,79,0.5)] shake-anim">👾</div>
            <div className="w-32 bg-[#1a181e] h-3 mx-auto border border-gray-600">
                <div className="bg-[#d9534f] h-full transition-all duration-300" style={{ width: `${(mob.hp / mob.maxHp) * 100}%` }}></div>
            </div>
            <p className="text-[10px] mt-1 text-gray-300 font-mono">{mob.name}</p>
        </div>
      </div>

      {/* Logs */}
      <div className="h-40 bg-black/90 p-4 overflow-y-auto text-[10px] font-mono border-t-2 border-[#e6c35c] z-10 space-y-1">
        {logs.map((l, i) => <div key={i} className={`${l.color}`}>{'>'} {l.text}</div>)}
        <div ref={logsEndRef} />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-[#2a2630] z-10 border-t border-gray-700">
         <button 
            onClick={playerAttack} 
            disabled={turn !== 'PLAYER'} 
            className="pixel-btn text-lg py-4 hover:bg-[#3a3442]"
         >
            ⚔️ АТАКА
         </button>
         <button 
            onClick={usePotion} 
            disabled={turn !== 'PLAYER'} 
            className="pixel-btn text-blue-300 border-blue-400 hover:bg-blue-900/30 text-lg py-4"
         >
            🧪 ЗЕЛЬЕ ({gameState.character!.inventory.filter(i => i.type === ItemType.POTION).length})
         </button>
      </div>
    </div>
  );
};

export default Dungeon;