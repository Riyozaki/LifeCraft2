import React, { useState } from 'react';
import { ClassType, Stats, Character, GameState, ReputationType, Equipment, Item } from '../types';
import { INITIAL_STATS, CLASS_DESCRIPTIONS, HEALTH_POTION, ITEMS_DATABASE, generateUUID } from '../constants';
import { saveGame } from '../services/storage';

interface Props {
  onComplete: (state: GameState) => void;
}

const CharacterCreation: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [bonusStats, setBonusStats] = useState<Stats>({ str: 0, dex: 0, int: 0, vit: 0 });
  const [pointsLeft, setPointsLeft] = useState(5); 
  const [nameError, setNameError] = useState(false);

  const handleNameSubmit = () => {
    if (name.length < 3 || name.length > 12 || !/^[a-zA-Z0-9_а-яА-ЯёЁ]+$/.test(name)) {
      setNameError(true);
      setTimeout(() => setNameError(false), 500);
      return;
    }
    setStep(2);
  };

  const handleStatChange = (stat: keyof Stats, val: number) => {
    if (!selectedClass) return;
    const base = INITIAL_STATS[selectedClass][stat];
    const currentBonus = bonusStats[stat];
    const diff = val - (base + currentBonus);
    
    // Limitation: No arbitrary cap, just points left
    if (diff > 0 && pointsLeft >= diff) {
      setBonusStats(prev => ({ ...prev, [stat]: currentBonus + diff }));
      setPointsLeft(prev => prev - diff);
    } 
    else if (diff < 0 && (base + currentBonus + diff) >= base) {
       setBonusStats(prev => ({ ...prev, [stat]: currentBonus + diff }));
       setPointsLeft(prev => prev - diff);
    }
  };

  const getStartingItems = (c: ClassType): { items: Item[], gold: number } => {
      // 2 Potions (Stackable logic handled by init)
      const items: Item[] = [{...HEALTH_POTION, amount: 2}];
      let gold = 150; 

      // Find specific starter items from DB
      const sword = ITEMS_DATABASE.find(i => i.id === 'w_war_0');
      const wand = ITEMS_DATABASE.find(i => i.id === 'w_mag_0');
      const dagger = ITEMS_DATABASE.find(i => i.id === 'w_sct_0');
      const staff = ITEMS_DATABASE.find(i => i.id === 'w_hlr_0');
      const manaPot = ITEMS_DATABASE.find(i => i.id === 'pot_mana');
      const whetstone = ITEMS_DATABASE.find(i => i.id === 'm_shard'); // Warrior bonus

      switch (c) {
          case ClassType.WARRIOR:
              if (sword) items.push(sword);
              if (whetstone) items.push({...whetstone, amount: 3}); // Bonus for warrior
              gold = 150; 
              break;
          case ClassType.MAGE:
              if (wand) items.push(wand);
              if (manaPot) items.push(manaPot);
              break;
          case ClassType.SCOUT:
              if (dagger) items.push(dagger);
              gold = 250; // Richer start
              break;
          case ClassType.HEALER:
              if (staff) items.push(staff);
              items.push({...HEALTH_POTION, amount: 3}); // More potions
              break;
      }
      // Add unique IDs
      return { 
          items: items.map(i => ({...i, id: generateUUID()})), 
          gold 
      };
  };

  const createCharacter = () => {
    if (!selectedClass) return;
    
    const finalStats: Stats = {
      str: INITIAL_STATS[selectedClass].str + bonusStats.str,
      dex: INITIAL_STATS[selectedClass].dex + bonusStats.dex,
      int: INITIAL_STATS[selectedClass].int + bonusStats.int,
      vit: INITIAL_STATS[selectedClass].vit + bonusStats.vit,
    };

    const maxHp = 50 + (finalStats.vit * 10); // Robust HP

    const emptyEquipment: Equipment = {
        weapon: null,
        head: null,
        body: null,
        hands: null,
        legs: null,
        ring: null,
        amulet: null,
        belt: null
    };
    
    const starter = getStartingItems(selectedClass);

    const newChar: Character = {
      name,
      classType: selectedClass,
      level: 1,
      currentExp: 0,
      stats: finalStats,
      hp: maxHp,
      maxHp,
      hpRegen: 1, // Base regen
      gold: starter.gold,
      inventory: starter.items,
      inventorySlots: 20,
      equipment: emptyEquipment,
      reputation: {
        [ReputationType.HEROISM]: 0,
        [ReputationType.DISCIPLINE]: 0,
        [ReputationType.CREATIVITY]: 0
      },
      honesty: 100,
      dailyStreak: 0,
      journal: [{
        id: 'init',
        date: Date.now(),
        text: 'Начало приключения. Я прибыл в этот мир, чтобы стать легендой.',
        mood: 'Inspired'
      }],
      settings: {
        fontSize: 'normal',
        highContrast: false
      },
      unlockedRecipes: []
    };

    const newState: GameState = {
      version: '1.1',
      character: newChar,
      lastDailyReset: 0, 
      lastWeeklyReset: 0,
      shopState: {
          items: [],
          discounts: {},
          lastUpdate: 0,
          visitStreak: 0
      },
      activeQuests: [],
      completedQuestIds: [],
      dungeonFloor: 1,
      currentDungeonId: null,
      dungeonState: {
          currentMob: null,
          bossDefeated: {},
          activeBuffs: [],
          activeDebuffs: []
      }
    };

    saveGame(newState);
    onComplete(newState);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 clouds-bg">
      <div className="retro-container w-full max-w-2xl p-8 text-center shadow-2xl">
        
        <h1 className="text-[#e6c35c] text-2xl mb-8 tracking-widest uppercase text-shadow-sm float-anim">
          Создание Героя
        </h1>

        {step === 1 && (
          <div className="flex flex-col items-center">
            <p className="mb-4 text-xs text-gray-400">Назови себя (3-12 символов)</p>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              className={`bg-[#1a181e] border-2 ${nameError ? 'border-red-500 shake-anim' : 'border-[#e6c35c]'} text-white p-4 text-center text-lg outline-none mb-2 w-64`}
              placeholder="Имя..."
              autoFocus
            />
            {nameError && <div className="text-red-500 text-[10px] mb-6">Только буквы, цифры и пробел</div>}
            {!nameError && <div className="mb-8"></div>}
            <button 
              onClick={handleNameSubmit}
              className="pixel-btn text-sm px-8 py-4"
            >
              ДАЛЕЕ &gt;
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-6 text-sm text-gray-400">Выбери свой путь</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {Object.values(ClassType).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setSelectedClass(c);
                    setBonusStats({ str: 0, dex: 0, int: 0, vit: 0 });
                    setPointsLeft(5); // Reset to 5
                  }}
                  className={`p-4 border-2 transition-all ${selectedClass === c ? 'border-[#e6c35c] bg-[#3a3442]' : 'border-gray-600 hover:border-gray-500 bg-[#2a2630]'}`}
                >
                  <div className={`w-16 h-16 mx-auto mb-3 bg-[#1a181e] flex items-center justify-center text-3xl border border-gray-700`}>
                    {c === ClassType.WARRIOR && '⚔️'}
                    {c === ClassType.MAGE && '🔮'}
                    {c === ClassType.SCOUT && '🗡️'}
                    {c === ClassType.HEALER && '🌿'}
                  </div>
                  <div className="text-[#e6c35c] text-sm mb-2">{c}</div>
                  <div className="text-[10px] text-gray-400 leading-tight min-h-[40px]">
                    {CLASS_DESCRIPTIONS[c]}
                  </div>
                </button>
              ))}
            </div>
            <button 
              disabled={!selectedClass}
              onClick={() => setStep(3)}
              className="pixel-btn px-8"
            >
              ПОДТВЕРДИТЬ &gt;
            </button>
          </div>
        )}

        {step === 3 && selectedClass && (
          <div>
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
               <h2 className="text-[#e6c35c] text-lg">{selectedClass}</h2>
               <div className="text-xs">Очки: <span className="text-[#e6c35c] text-lg">{pointsLeft}</span></div>
            </div>

            <div className="space-y-4 mb-8">
              {(Object.keys(INITIAL_STATS[selectedClass]) as Array<keyof Stats>).map(stat => {
                 const base = INITIAL_STATS[selectedClass][stat];
                 const current = base + bonusStats[stat];
                 
                 return (
                   <div key={stat} className="flex items-center justify-between group">
                     <span className="uppercase w-16 text-left text-xs text-gray-400 group-hover:text-[#e6c35c] transition-colors">{stat}</span>
                     <button 
                        className="text-gray-500 hover:text-white px-2 py-1 text-xl"
                        onClick={() => handleStatChange(stat, current - 1)}
                     >-</button>
                     <span className="w-8 text-center text-[#e6c35c] font-bold">{current}</span>
                     <button 
                        className="text-gray-500 hover:text-white px-2 py-1 text-xl"
                        onClick={() => handleStatChange(stat, current + 1)}
                     >+</button>
                   </div>
                 )
              })}
            </div>

            <div className="flex justify-between mt-8">
                <button 
                  onClick={() => setStep(2)}
                  className="text-gray-500 text-xs hover:text-white underline"
                >
                  &lt; Назад
                </button>
                <button 
                  onClick={createCharacter}
                  disabled={pointsLeft > 0}
                  className="pixel-btn px-6 py-3"
                >
                  НАЧАТЬ ИГРУ
                </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CharacterCreation;