import React, { useState, useEffect, useRef } from 'react';
import { GameState, ItemType, Item, DungeonInfo, DungeonBiome } from '../types';
import { HEALTH_POTION, XP_TO_LEVEL, generateLootForSource, DUNGEONS, MOBS_BY_BIOME } from '../constants';

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
  const [playerHp, setPlayerHp] = useState(gameState.character?.hp || 0);
  const [enemyHp, setEnemyHp] = useState(100);
  const [enemyMaxHp, setEnemyMaxHp] = useState(100);
  const [enemyName, setEnemyName] = useState('Враг');
  const [enemyDef, setEnemyDef] = useState(0); // New State for Enemy DEF
  const [turn, setTurn] = useState<'PLAYER' | 'ENEMY' | 'WIN' | 'LOSE'>('PLAYER');
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const currentDungeon = DUNGEONS.find(d => d.id === gameState.currentDungeonId);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Init Floor or Selection
  useEffect(() => {
    if (gameState.currentDungeonId) {
        setInSelection(false);
        startEncounter();
    } else {
        setInSelection(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.dungeonFloor, gameState.currentDungeonId]);

  const addLog = (text: string, color: string = 'text-gray-300') => {
    setLogs(prev => [...prev.slice(-4), { text, color }]);
  };

  const selectDungeon = (dungeonId: string) => {
      const dungeon = DUNGEONS.find(d => d.id === dungeonId);
      if (dungeon && gameState.character!.level >= dungeon.minLevel) {
          updateState({ currentDungeonId: dungeonId, dungeonFloor: 1 });
          setPlayerHp(gameState.character!.hp); // Reset visuals to max
      } else {
          addNotification("Уровень слишком мал!");
      }
  };

  const getDungeonEffectClass = () => {
      switch(currentDungeon?.biome) {
          case DungeonBiome.SWAMP: return 'fog-anim';
          case DungeonBiome.HELL: return 'lava-anim';
          case DungeonBiome.ICE: return 'snow-anim';
          default: return '';
      }
  };

  const startEncounter = () => {
    if (!currentDungeon) return;

    const floor = gameState.dungeonFloor;
    const charLevel = gameState.character!.level;
    const isBoss = floor % 5 === 0;
    const isElite = !isBoss && Math.random() > 0.8;
    
    // Formula: MobLevel = PlayerLevel + floor(Floor/2) + Random(-1, 1)
    const mobLevel = Math.max(1, charLevel + Math.floor(floor / 2) + (Math.floor(Math.random() * 3) - 1));

    // Mob Rarity: Common=0, Rare=1, Epic=2 (Elite counts as Rare/Epic roughly)
    const mobRarityVal = isBoss ? 3 : (isElite ? 1 : 0);

    let hp = 0;
    if (isBoss) {
        // Formula: 500 + 100 * PlayerLvl + 50 * Floor
        hp = 500 + 100 * charLevel + 50 * floor;
    } else {
        // Formula: 100 * (1 + Floor/2) * (1 + MobRarity/10)
        hp = Math.floor(100 * (1 + floor / 2) * (1 + mobRarityVal / 10));
    }

    // Approx Mob DEF = Level * 1.5
    const def = Math.floor(mobLevel * 1.5);
    
    setEnemyMaxHp(hp);
    setEnemyHp(hp);
    setEnemyDef(def);
    setTurn('PLAYER');
    
    const mobs = MOBS_BY_BIOME[currentDungeon.biome] || MOBS_BY_BIOME[DungeonBiome.FOREST];
    const template = mobs[Math.floor(Math.random() * mobs.length)];
    
    let name = template.name;
    if (isElite) name = `Элитный ${name}`;
    if (isBoss) name = `СТРАЖ: Древний ${name}`;
    
    setEnemyName(`${name} (Ур.${mobLevel})`);
    addLog(`Этаж ${floor}: ${name} (HP:${hp} DEF:${def})`, 'text-[#e6c35c]');
  };

  const applyDungeonEffects = (phase: 'START_TURN' | 'END_TURN') => {
      if (!currentDungeon) return false;
      
      if (currentDungeon.biome === DungeonBiome.DESERT && phase === 'START_TURN') {
          setPlayerHp(p => Math.max(0, p - 2));
          addLog("Жара иссушает: -2 HP", "text-orange-400");
      }
      if (currentDungeon.biome === DungeonBiome.HELL && phase === 'START_TURN') {
          setPlayerHp(p => Math.max(0, p - 3));
          addLog("Адский жар: -3 HP", "text-red-600");
      }
      
      if (currentDungeon.biome === DungeonBiome.ICE && phase === 'START_TURN') {
          if (Math.random() < 0.15) {
              addLog("Вы скованы льдом! Ход пропущен.", "text-blue-300");
              setTurn('ENEMY');
              setTimeout(enemyTurn, 1000);
              return true; 
          }
      }
      return false;
  };

  const calculatePlayerDmg = () => {
      const char = gameState.character!;
      let baseStr = char.stats.str;
      // Get Equipment Stats
      Object.values(char.equipment).forEach((val) => {
          const item = val as Item | null;
          if (item?.stats?.str) baseStr += item.stats.str;
      });

      // Simple skill bonus approximation based on Class (e.g., Warrior +20% base)
      let skillBonus = 0;
      if (char.classType === 'Воин') skillBonus = 20;

      // Formula: (PlayerATK * (1 + Skill/100)) - MobDEF
      // BaseATK roughly STR * 2
      const playerATK = baseStr * 2;
      const rawDmg = Math.floor(playerATK * (1 + skillBonus / 100));
      const finalDmg = Math.max(1, rawDmg - enemyDef);
      
      return finalDmg;
  };

  const playerAttack = () => {
    if (turn !== 'PLAYER') return;
    
    if (applyDungeonEffects('START_TURN')) return;

    const dmg = calculatePlayerDmg();
    const char = gameState.character!;

    if (currentDungeon?.biome === DungeonBiome.SWAMP && Math.random() < 0.1) {
        addLog("Промах в тумане!", "text-gray-500");
        setTurn('ENEMY');
        setTimeout(enemyTurn, 1000);
        return;
    }

    let dex = char.stats.dex;
    Object.values(char.equipment).forEach((val) => { 
        const item = val as Item | null;
        if (item?.stats?.dex) dex += item.stats.dex; 
    });

    // Crit Formula: 5 + AGI/5 + ClassBonus
    let classCritBonus = 0;
    if (char.classType === 'Разведчик') classCritBonus = 15;
    const critChance = 5 + (dex / 5) + classCritBonus;
    
    const isCrit = Math.random() * 100 < critChance;
    
    let finalDmg = dmg;
    if (isCrit) {
        finalDmg = Math.floor(dmg * 2); // Crit is double damage
        addLog(`КРИТИЧЕСКИЙ УДАР! ${finalDmg} урона!`, 'text-red-400');
    } else {
        addLog(`Вы наносите ${finalDmg} урона.`);
    }

    const newEnemyHp = Math.max(0, enemyHp - finalDmg);
    setEnemyHp(newEnemyHp);

    if (newEnemyHp === 0) {
        handleWin();
    } else {
        setTurn('ENEMY');
        setTimeout(enemyTurn, 1000);
    }
  };

  const usePotion = () => {
    if (turn !== 'PLAYER') return;
    if (applyDungeonEffects('START_TURN')) return;

    const char = gameState.character!;
    const potionIdx = char.inventory.findIndex(i => i.type === ItemType.POTION);
    
    if (potionIdx === -1) {
        addLog("Зелья закончились!", "text-gray-500");
        return;
    }

    const potionItem = char.inventory[potionIdx];
    // Formula: PotionBase + (PlayerLevel * Quality) / 2
    // Quality: Common=1, Rare=2 (using rarity enum logic roughly)
    let quality = 1;
    if (potionItem.rarity === 'Редкий') quality = 2;
    if (potionItem.rarity === 'Эпический') quality = 3;

    const baseHeal = potionItem.healAmount || 50;
    const healAmount = Math.floor(baseHeal + (char.level * quality) / 2);

    const newHp = Math.min(char.maxHp, playerHp + healAmount);
    setPlayerHp(newHp);
    
    const newInv = [...char.inventory];
    newInv.splice(potionIdx, 1);
    
    updateState({ character: { ...char, inventory: newInv, hp: newHp } });
    addLog(`Выпито зелье. +${healAmount} HP.`, "text-green-400");
    setTurn('ENEMY');
    setTimeout(enemyTurn, 1000);
  };

  const enemyTurn = () => {
    if (turn === 'WIN' || turn === 'LOSE') return;

    const floor = gameState.dungeonFloor;
    const char = gameState.character!;
    const isBoss = floor % 5 === 0;
    
    let baseDmg = (floor * 3) + Math.floor(Math.random() * 5);
    if (currentDungeon?.biome === DungeonBiome.HELL) baseDmg += 5;

    // Boss Special Attack: 25 + BossHP% / 10
    if (isBoss) {
        const hpPct = (enemyHp / enemyMaxHp) * 100;
        const specialChance = 25 + hpPct / 10;
        if (Math.random() * 100 < specialChance) {
            baseDmg = Math.floor(baseDmg * 1.5);
            addLog(`${enemyName} использует ЯРОСТЬ!`, 'text-red-400 font-bold');
        }
    }

    let vit = char.stats.vit;
    Object.values(char.equipment).forEach((val) => { 
        const item = val as Item | null;
        if (item?.stats?.vit) vit += item.stats.vit; 
    });
    
    const mitigation = Math.floor(vit / 2);
    const finalDmg = Math.max(1, baseDmg - mitigation);

    setPlayerHp(prev => {
        const newVal = Math.max(0, prev - finalDmg);
        if (newVal === 0) setTurn('LOSE');
        else setTurn('PLAYER');
        return newVal;
    });

    addLog(`${enemyName} атакует на ${finalDmg}!`, 'text-red-500');
  };

  const handleWin = () => {
    setTurn('WIN');
    const floor = gameState.dungeonFloor;
    const isBoss = floor % 5 === 0;
    const isElite = !isBoss && Math.random() > 0.8;
    
    const xpGain = floor * 20;
    const goldGain = floor * 15;
    
    // Generate Loot
    const sourceType = isBoss ? 'BOSS' : (isElite ? 'ELITE' : 'MOB');
    const loot = generateLootForSource(gameState.character!, floor, sourceType, currentDungeon?.biome);

    addLog(`Победа! +${goldGain}з, +${xpGain}xp`, 'text-[#e6c35c]');
    if (loot) addLog(`Найдено: ${loot.icon || ''} ${loot.name}`, 'text-[#8be9fd]');

    // Update State
    const char = { ...gameState.character! };
    char.gold += goldGain;
    char.currentExp += xpGain;
    
    const reqXp = XP_TO_LEVEL(char.level);
    if (char.currentExp >= reqXp) {
        char.level++;
        char.currentExp -= reqXp;
        // Stat points logic handled in UI, just basic stat bump here to prevent crash if not allocated
        char.maxHp += 10;
        addLog(`УРОВЕНЬ ПОВЫШЕН! Теперь ${char.level}`, 'text-[#50fa7b]');
    }

    if (loot) {
        if (char.inventory.length < char.inventorySlots) {
            char.inventory.push(loot);
        } else {
            addLog(`Сумка полна! Добыча потеряна.`, 'text-gray-500');
        }
    }

    if (char.classType === 'Целитель') {
        const heal = Math.floor(char.maxHp * 0.2);
        setPlayerHp(Math.min(char.maxHp, playerHp + heal)); 
        char.hp = Math.min(char.maxHp, char.hp + heal);
    } else {
        char.hp = playerHp; 
    }

    setTimeout(() => {
        updateState({ character: char, dungeonFloor: floor + 1 });
    }, 2000);
  };

  const handleRun = () => {
    const char = { ...gameState.character! };
    char.hp = playerHp;
    updateState({ character: char, currentDungeonId: null });
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
                          {d.effectDescription && <div className="text-[10px] text-[#d9534f] uppercase tracking-wider">⚠ {d.effectDescription}</div>}
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
                    updateState({ character: char, dungeonFloor: 1, currentDungeonId: null });
                    goHome();
                }}
                className="pixel-btn text-[#d9534f] border-[#d9534f] hover:bg-red-900"
              >
                  ВОСКРЕСНУТЬ (-1 Этаж)
              </button>
          </div>
      )
  }

  return (
    <div className={`flex flex-col h-full bg-black/50 relative overflow-hidden ${getDungeonEffectClass()}`}>
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

        <div className={`text-center transition-transform duration-300 ${turn === 'ENEMY' ? 'scale-110' : ''} ${turn === 'WIN' ? 'opacity-0 scale-50' : ''}`}>
             <div className="w-20 h-20 bg-[#2a2630] border-2 border-[#d9534f] mb-3 mx-auto flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(217,83,79,0.5)] shake-anim">👾</div>
            <div className="w-32 bg-[#1a181e] h-3 mx-auto border border-gray-600">
                <div className="bg-[#d9534f] h-full transition-all duration-300" style={{ width: `${(enemyHp / enemyMaxHp) * 100}%` }}></div>
            </div>
            <p className="text-[10px] mt-1 text-gray-300 font-mono">{enemyName}</p>
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