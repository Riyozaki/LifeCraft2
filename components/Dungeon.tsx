import React, { useState, useEffect, useRef } from 'react';
import { GameState, ItemType, Item, DungeonInfo, DungeonBiome, Mob } from '../types';
import { HEALTH_POTION, XP_TO_LEVEL, generateLootForSource, DUNGEONS, MOBS_BY_BIOME, generateMob, RARITY_COLORS, MOB_RARITY_CONFIG, GAME_BALANCE } from '../constants';
import { addItemToInventory } from '../services/game';

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
  const [isAuto, setIsAuto] = useState(false);

  // Local turn state
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
              dungeonState: { ...gameState.dungeonState, currentMob: null } 
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

    // Difficulty Scale
    const diffMult = 1 + (currentDungeon.minLevel * 0.15);
    const newMob = generateMob(currentDungeon.biome, floor, isBoss, isElite, diffMult);
    
    updateState({
        dungeonState: {
            ...gameState.dungeonState,
            currentMob: newMob
        }
    });
    
    setTurn('PLAYER');
    
    if (floor % 10 === 0 && isBoss) {
        addLog(`⚠️ ВНИМАНИЕ: ${newMob.name} (Ур.${newMob.level})`, 'text-red-500 font-bold underline');
        addLog(`Способность: ${newMob.specialAbility}`, 'text-[#ff5555]');
    } else {
        addLog(`Этаж ${floor}: ${newMob.name} (Ур.${newMob.level})`, 'text-[#e6c35c]');
    }
    
    if (currentDungeon.biome === DungeonBiome.HELL) addLog("Жар преисподней сжигает вас!", "text-red-600");
    if (currentDungeon.biome === DungeonBiome.SWAMP) addLog("Вязкая топь мешает двигаться.", "text-green-700");
  };

  const playerAttack = () => {
    if (turn !== 'PLAYER' || !mob) return;
    
    const char = gameState.character!;
    let baseStr = char.stats.str;
    let baseDex = char.stats.dex;
    let baseInt = char.stats.int;

    let weaponDmg = 0;

    Object.values(char.equipment).forEach((val) => {
        const item = val as Item | null;
        if (item) {
             if (item.stats?.str) baseStr += item.stats.str;
             if (item.stats?.dex) baseDex += item.stats.dex;
             if (item.stats?.int) baseInt += item.stats.int;
             if (item.type === ItemType.WEAPON) {
                 weaponDmg += (item.levelReq * 2) + (item.price / 50); 
             }
        }
    });

    // Buff Application
    const buffs = gameState.dungeonState.activeBuffs;
    if (buffs.some(b => b.name === 'Вдохновение')) weaponDmg *= 1.1;

    let primaryStat = baseStr;
    if (char.classType === 'Разведчик') primaryStat = baseDex;
    if (char.classType === 'Маг' || char.classType === 'Целитель') primaryStat = baseInt;

    const statMult = 1 + (primaryStat * GAME_BALANCE.SCALING.DAMAGE_STAT_MULT);
    const baseDmg = Math.max(5, weaponDmg);
    
    const playerATK = Math.floor(baseDmg * statMult);
    
    // Biome Mechanics: Miss Chance
    let missChance = 0;
    if (currentDungeon?.biome === DungeonBiome.SWAMP) missChance = 0.20;
    if (currentDungeon?.biome === DungeonBiome.AETHER) missChance = 0.30; 

    if (Math.random() < missChance) {
        addLog("ПРОМАХ! Окружение помешало атаке.", "text-gray-500");
        setTurn('ENEMY');
        setTimeout(() => enemyTurn(mob.hp), 800);
        return;
    }

    let dmgMod = 1.0;
    if (currentDungeon?.biome === DungeonBiome.ICE) dmgMod = 0.9;
    if (currentDungeon?.biome === DungeonBiome.CAVE) dmgMod = 0.85; 

    const variance = 0.9 + Math.random() * 0.2;
    const rawDmg = Math.floor(playerATK * variance * dmgMod);
    
    const mitigation = 100 / (100 + mob.def);
    const finalDmg = Math.max(1, Math.floor(rawDmg * mitigation));

    const critChance = 5 + (baseDex / 3);
    const isCrit = Math.random() * 100 < critChance;
    
    let actualDmg = isCrit ? Math.floor(finalDmg * 2.0) : finalDmg; 
    
    const newMobHp = Math.max(0, mob.hp - actualDmg);
    
    updateState({
        dungeonState: {
            ...gameState.dungeonState,
            currentMob: { ...mob, hp: newMobHp }
        }
    });

    if (isCrit) addLog(`КРИТИЧЕСКИЙ УДАР! ${actualDmg} урона!`, 'text-red-400 font-bold');
    else addLog(`Вы наносите ${actualDmg} урона.`);

    if (newMobHp === 0) {
        handleWin(mob);
    } else {
        setTurn('ENEMY');
        setTimeout(() => enemyTurn(newMobHp), 1000);
    }
  };

  const enemyTurn = (currentMobHp: number) => {
    if (!mob) return; 
    
    const char = gameState.character!;
    let currentMobState = { ...mob, hp: currentMobHp }; // Work with local copy for multiple updates

    // --- BOSS ABILITY LOGIC ---
    let abilityTriggered = false;
    let extraDmgMult = 1.0;

    if (mob.specialAbility) {
        const roll = Math.random();
        // 30% chance to use ability
        if (roll < 0.3) {
             abilityTriggered = true;
             
             if (mob.specialAbility === 'REGEN') {
                 const heal = Math.floor(mob.maxHp * 0.1);
                 currentMobState.hp = Math.min(mob.maxHp, currentMobState.hp + heal);
                 addLog(`${mob.name} регенерирует ${heal} HP!`, 'text-green-500');
             }
             else if (mob.specialAbility === 'CRITICAL') {
                 extraDmgMult = 2.0;
                 addLog(`${mob.name} готовит СОКРУШИТЕЛЬНЫЙ УДАР!`, 'text-red-600 font-bold');
             }
             // VAMPIRISM handled after damage calculation
        }
    }

    let vit = char.stats.vit;
    Object.values(char.equipment).forEach((val) => { 
        const item = val as Item | null;
        if (item?.stats?.vit) vit += item.stats.vit; 
    });
    
    // Player Defense Formula
    const def = vit * 2; // Simple armor proxy
    const mitigation = 100 / (100 + def);

    const variance = 0.9 + Math.random() * 0.2;
    let mobAtkVar = Math.floor(mob.atk * variance * extraDmgMult);
    
    if (currentDungeon?.biome === DungeonBiome.NECROPOLIS) mobAtkVar = Math.floor(mobAtkVar * 1.1);

    const dmgToPlayer = Math.max(1, Math.floor(mobAtkVar * mitigation));
    
    // Vampirism Effect
    if (abilityTriggered && mob.specialAbility === 'VAMPIRISM') {
        const vampHeal = Math.floor(dmgToPlayer * 0.5);
        currentMobState.hp = Math.min(mob.maxHp, currentMobState.hp + vampHeal);
        addLog(`${mob.name} высасывает жизнь! +${vampHeal} HP`, 'text-purple-400');
    }

    // Update Mob State first if ability changed HP
    if (abilityTriggered && (mob.specialAbility === 'REGEN' || mob.specialAbility === 'VAMPIRISM')) {
         updateState({
            dungeonState: {
                ...gameState.dungeonState,
                currentMob: currentMobState
            }
        });
    }

    let newPlayerHp = Math.max(0, char.hp - dmgToPlayer);
    
    addLog(`${mob.name} атакует на ${dmgToPlayer}!`, 'text-red-500');

    // Hell DOT
    if (currentDungeon?.biome === DungeonBiome.HELL && newPlayerHp > 0) {
        const burn = Math.ceil(char.maxHp * 0.02);
        newPlayerHp = Math.max(0, newPlayerHp - burn);
        addLog(`Ожог: -${burn} HP`, "text-orange-500");
    }

    if (newPlayerHp === 0) {
        updateState({ character: { ...char, hp: newPlayerHp } });
        setTurn('LOSE');
        setIsAuto(false);
    } else {
        updateState({ character: { ...char, hp: newPlayerHp } });
        setTurn('PLAYER');
    }
  };

  const handleWin = (defeatedMob: Mob) => {
    setTurn('WIN');
    const floor = gameState.dungeonFloor;
    const rarityMult = MOB_RARITY_CONFIG[defeatedMob.rarity].xp;

    const xpGain = Math.floor(defeatedMob.level * 20 * rarityMult);
    const goldGain = Math.floor(defeatedMob.level * 15 * rarityMult);
    
    // Extra loot for Major Bosses
    let loot = generateLootForSource(gameState.character!, floor, defeatedMob.rarity, currentDungeon?.biome);
    
    if (floor % 10 === 0 && defeatedMob.isBoss) {
        addLog(`⚔️ ВЕЛИКАЯ ПОБЕДА НАД БОССОМ!`, 'text-[#ff5555] font-bold');
        // Chance for double loot
        if (Math.random() > 0.5) {
             const extraLoot = generateLootForSource(gameState.character!, floor, defeatedMob.rarity);
             if (extraLoot) {
                 const charWithExtra = addItemToInventory(gameState.character!, extraLoot);
                 // We need to chain state updates, but here we can just do it sequentially in logs/logic
                 // or just overwrite "loot" variable if we only support displaying one line.
                 // Better: direct add.
                 updateState({ character: charWithExtra });
                 addLog(`Доп. Награда: ${extraLoot.icon} ${extraLoot.name}`, 'text-[#bd93f9]');
             }
        }
    }

    addLog(`Победа! +${goldGain}з, +${xpGain}xp`, 'text-[#e6c35c]');
    if (loot) addLog(`Найдено: ${loot.icon || ''} ${loot.name}`, 'text-[#8be9fd]');

    let newChar = { ...gameState.character! };
    // Refetch char in case extra loot modified it above (simulated via local var for safety)
    // Actually `updateState` is async batch, so we should rely on `gameState.character` being "current" relative to this render cycle,
    // but inside this function `gameState` is stale closure. 
    // We should be careful. 
    // Simplified: Just accumulate changes on the `newChar` object derived from props.
    
    newChar.gold += goldGain;
    newChar.currentExp += xpGain;
    
    const healAmt = Math.floor(newChar.maxHp * 0.1) + newChar.stats.vit;
    newChar.hp = Math.min(newChar.maxHp, newChar.hp + healAmt);
    addLog(`Отдых: +${healAmt} HP`, 'text-green-400');

    const reqXp = XP_TO_LEVEL(newChar.level);
    if (newChar.currentExp >= reqXp) {
        newChar.level++;
        newChar.currentExp -= reqXp;
        newChar.maxHp += 10;
        newChar.hp = newChar.maxHp; 
        addLog(`УРОВЕНЬ ПОВЫШЕН! Теперь ${newChar.level}`, 'text-[#50fa7b]');
    }

    if (loot) {
        newChar = addItemToInventory(newChar, loot);
    }

    if (defeatedMob.isBoss) {
        const bossKey = `${gameState.currentDungeonId}_${floor}`;
        gameState.dungeonState.bossDefeated[bossKey] = true;
    }

    // Clear buffs after fight
    const cleanDungeonState = { 
        ...gameState.dungeonState, 
        currentMob: null,
        activeBuffs: [], 
        activeDebuffs: [] 
    };

    setTimeout(() => {
        updateState({ 
            character: newChar, 
            dungeonFloor: floor + 1,
            dungeonState: cleanDungeonState 
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

    const potion = char.inventory[potionIdx];
    const baseHeal = 60 + Math.floor(char.maxHp * 0.15);
    const healAmount = baseHeal;

    const newHp = Math.min(char.maxHp, char.hp + healAmount);
    
    const newInv = [...char.inventory];
    if (potion.amount && potion.amount > 1) {
        newInv[potionIdx] = { ...potion, amount: potion.amount - 1 };
    } else {
        newInv.splice(potionIdx, 1);
    }
    
    updateState({ character: { ...char, inventory: newInv, hp: newHp } });
    
    addLog(`Выпито зелье. +${healAmount} HP. Ход сохранен.`, "text-green-400");
  };

  const handleRun = () => {
    setIsAuto(false);
    updateState({ currentDungeonId: null, dungeonState: { ...gameState.dungeonState, currentMob: null } });
    goHome();
  };

  // Auto Combat Logic
  useEffect(() => {
    // Only run this effect if state allows a move
    if (!isAuto || turn !== 'PLAYER' || !mob || !gameState.character) return;

    // Capture current HP for logic, but be careful with dependencies
    const char = gameState.character;
    const hpThreshold = char.maxHp * 0.40;
    const hasPotion = char.inventory.some(i => i.type === ItemType.POTION);

    const timer = setTimeout(() => {
        // Double check turn hasn't changed in the meantime
        if (turn === 'PLAYER') {
            if (char.hp < hpThreshold && hasPotion) {
                usePotion();
            } else {
                playerAttack();
            }
        }
    }, 800);

    return () => clearTimeout(timer);
    // Removed `gameState.character.hp` from dependencies to avoid loop if not needed, 
    // but we need it for `char.hp < hpThreshold`. 
    // `turn` changes to 'ENEMY' immediately after playerAttack, which cleans this up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuto, turn, mob /*, gameState.character.hp */]);

  const getBiomeClass = (biome?: DungeonBiome) => {
    switch (biome) {
      case DungeonBiome.FOREST: return 'biome-forest';
      case DungeonBiome.CAVE: return 'biome-cave';
      case DungeonBiome.SWAMP: return 'biome-swamp';
      case DungeonBiome.DESERT: return 'biome-desert';
      case DungeonBiome.ICE: return 'biome-ice';
      case DungeonBiome.NECROPOLIS: return 'biome-necropolis';
      case DungeonBiome.SKY: return 'biome-sky';
      case DungeonBiome.HELL: return 'biome-hell';
      case DungeonBiome.CHAOS: return 'biome-chaos';
      case DungeonBiome.AETHER: return 'biome-aether';
      default: return 'bg-black/50';
    }
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
                          <div className="text-[10px] text-[#d9534f] mt-1">{d.effectDescription}</div>
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
              
              <div className="text-xs text-gray-500 mb-6">
                 <p>Потеряно часть золота</p>
                 <p>Откат: до ближайшего безопасного этажа</p>
              </div>

              <button 
                onClick={() => {
                    const char = { ...gameState.character! };
                    // Penalty Cap: Max 500 gold loss or 20%
                    const loss = Math.min(500, Math.floor(char.gold * 0.2));
                    char.gold -= loss;
                    char.hp = Math.floor(char.maxHp / 2);
                    
                    // Penalty Floor: Max 5 floors regression, but not below 1
                    const penaltyFloor = Math.max(1, gameState.dungeonFloor - 5);

                    updateState({ 
                        character: char, 
                        dungeonFloor: penaltyFloor, 
                        currentDungeonId: null,
                        dungeonState: { ...gameState.dungeonState, currentMob: null } 
                    });
                    goHome();
                }}
                className="pixel-btn text-[#d9534f] border-[#d9534f] hover:bg-red-900"
              >
                  ВОСКРЕСНУТЬ
              </button>
          </div>
      )
  }

  if (!mob) return <div>Loading encounter...</div>;

  return (
    <div className={`flex flex-col h-full relative overflow-hidden ${getBiomeClass(currentDungeon?.biome)}`}>
      {/* Top Bar */}
      <div className="flex justify-between items-center p-3 bg-[#1a181e] border-b-2 border-black z-10 relative">
        <div className="text-xs text-gray-300">{currentDungeon?.name} — Этаж {gameState.dungeonFloor}</div>
        <div className="flex gap-4">
             <button 
                onClick={() => setIsAuto(!isAuto)} 
                className={`text-[10px] px-2 py-1 border transition-colors ${isAuto ? 'bg-[#e6c35c] text-black border-white animate-pulse' : 'border-gray-500 text-gray-400'}`}
             >
                {isAuto ? 'AUTO ON' : 'AUTO OFF'}
             </button>
             <button onClick={handleRun} className="text-[10px] text-[#d9534f] hover:text-white uppercase tracking-wider">Покинуть бой</button>
        </div>
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
             <div 
                className="w-20 h-20 bg-[#2a2630] border-2 mb-3 mx-auto flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(217,83,79,0.5)] shake-anim"
                style={{ borderColor: RARITY_COLORS[mob.rarity] }}
             >
                 👾
             </div>
            <div className="w-32 bg-[#1a181e] h-3 mx-auto border border-gray-600">
                <div className="bg-[#d9534f] h-full transition-all duration-300" style={{ width: `${(mob.hp / mob.maxHp) * 100}%` }}></div>
            </div>
            <div className="text-[10px] mt-1 font-mono">
                <span style={{ color: RARITY_COLORS[mob.rarity] }} className="font-bold">{mob.name}</span>
                <span className="text-gray-400 text-[8px] block">{mob.rarity}</span>
            </div>
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
            disabled={turn !== 'PLAYER' || isAuto} 
            className="pixel-btn text-lg py-4 hover:bg-[#3a3442]"
         >
            ⚔️ АТАКА
         </button>
         <button 
            onClick={usePotion} 
            disabled={turn !== 'PLAYER' || isAuto} 
            className="pixel-btn text-blue-300 border-blue-400 hover:bg-blue-900/30 text-lg py-4"
         >
            🧪 ЗЕЛЬЕ ({gameState.character!.inventory.reduce((acc, i) => i.type === ItemType.POTION ? acc + (i.amount || 1) : acc, 0)})
         </button>
      </div>
    </div>
  );
};

export default Dungeon;