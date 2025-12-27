import React, { useState } from 'react';
import { ClassType, Stats, Character, GameState, ReputationType, Equipment } from '../types';
import { INITIAL_STATS, CLASS_DESCRIPTIONS, HEALTH_POTION } from '../constants';
import { saveGame } from '../services/storage';

interface Props {
  onComplete: (state: GameState) => void;
}

const CharacterCreation: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [bonusStats, setBonusStats] = useState<Stats>({ str: 0, dex: 0, int: 0, vit: 0 });
  const [pointsLeft, setPointsLeft] = useState(10);
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

    if (diff > 0 && pointsLeft >= diff && (base + currentBonus + diff) <= 20) {
      setBonusStats(prev => ({ ...prev, [stat]: currentBonus + diff }));
      setPointsLeft(prev => prev - diff);
    } 
    else if (diff < 0 && (base + currentBonus + diff) >= base) {
       setBonusStats(prev => ({ ...prev, [stat]: currentBonus + diff }));
       setPointsLeft(prev => prev - diff);
    }
  };

  const createCharacter = () => {
    if (!selectedClass) return;
    
    const finalStats: Stats = {
      str: INITIAL_STATS[selectedClass].str + bonusStats.str,
      dex: INITIAL_STATS[selectedClass].dex + bonusStats.dex,
      int: INITIAL_STATS[selectedClass].int + bonusStats.int,
      vit: INITIAL_STATS[selectedClass].vit + bonusStats.vit,
    };

    const maxHp = 50 + (finalStats.vit * 5);

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

    const newChar: Character = {
      name,
      classType: selectedClass,
      level: 1,
      currentExp: 0,
      stats: finalStats,
      hp: maxHp,
      maxHp,
      gold: 100,
      inventory: [HEALTH_POTION, HEALTH_POTION, HEALTH_POTION],
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
      character: newChar,
      lastDailyReset: 0, // Force quest refresh on first load
      lastWeeklyReset: 0,
      lastShopUpdate: 0,
      shopItems: [],
      activeQuests: [],
      completedQuestIds: [],
      dungeonFloor: 1,
      currentDungeonId: null,
      shopVisitStreak: 0
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
              className={`bg-[#1a181e] border-2 ${nameError ? 'border-red-500 shake-anim' : 'border-[#e6c35c]'} text-white p-4 text-center text-lg outline-none mb-8 w-64`}
              placeholder="Имя..."
              autoFocus
            />
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
                    setPointsLeft(10);
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
                     <input 
                        type="range" 
                        min={base} 
                        max={20} 
                        value={current}
                        onChange={(e) => handleStatChange(stat, parseInt(e.target.value))}
                        className="w-full mx-4 accent-[#e6c35c] cursor-pointer"
                     />
                     <span className="w-8 text-right text-[#e6c35c] font-bold">{current}</span>
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