import React, { useEffect, useState } from 'react';
import { GameState, Quest, ItemRarity, JournalEntry, QuestCategory, ReputationType } from '../types';
import { 
    DAILY_QUEST_POOL, WEEKLY_QUEST_POOL, ONETIME_QUEST_POOL, EVENT_DEFINITIONS, 
    RARITY_COLORS, generateRandomItem, XP_TO_LEVEL, STAT_POINTS_PER_LEVEL
} from '../constants';

interface Props {
  gameState: GameState;
  updateState: (s: Partial<GameState>) => void;
  addNotification: (msg: string) => void;
}

const QuestBoard: React.FC<Props> = ({ gameState, updateState, addNotification }) => {
  const [activeTab, setActiveTab] = useState<QuestCategory>(QuestCategory.DAILY);
  const [reflectionQuestId, setReflectionQuestId] = useState<string | null>(null);

  useEffect(() => {
    refreshQuestsIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshQuestsIfNeeded = () => {
    const now = new Date();
    const lastDaily = new Date(gameState.lastDailyReset);
    const lastWeekly = new Date(gameState.lastWeeklyReset || 0);

    const isNewDay = now.getDate() !== lastDaily.getDate() || now.getMonth() !== lastDaily.getMonth();
    const daysSinceWeekly = (now.getTime() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24);
    const isNewWeek = (now.getDay() === 1 && daysSinceWeekly > 1) || daysSinceWeekly > 7;

    const isForceInit = gameState.activeQuests.length === 0;

    let newActiveQuests = [...gameState.activeQuests];
    let dailyResetTime = gameState.lastDailyReset;
    let weeklyResetTime = gameState.lastWeeklyReset || 0;
    let charUpdates: any = {};

    if (isNewDay || isForceInit) {
        if (!isForceInit) {
            const uncompletedDailies = newActiveQuests.filter(q => q.category === QuestCategory.DAILY && !q.completed).length;
            if (uncompletedDailies >= 3) { 
                 addNotification("Пропущены задания! Штраф честности.");
                 charUpdates.dailyStreak = 0;
                 charUpdates.honesty = Math.max(0, (gameState.character?.honesty || 100) - 15);
            }
        }

        newActiveQuests = newActiveQuests.filter(q => q.category !== QuestCategory.DAILY);
        
        for (let i = 0; i < 3; i++) {
            const template = DAILY_QUEST_POOL[Math.floor(Math.random() * DAILY_QUEST_POOL.length)];
            // Formula: Base Reward logic mostly here, scaling applied on completion
            newActiveQuests.push({
                ...template,
                id: `d_${Date.now()}_${i}`,
                category: QuestCategory.DAILY,
                rewardGold: 50, 
                rewardExp: 20,
                completed: false
            });
        }
        dailyResetTime = Date.now();
    }

    if (isNewWeek || isForceInit) {
         newActiveQuests = newActiveQuests.filter(q => q.category !== QuestCategory.WEEKLY);

         for (let i = 0; i < 2; i++) {
            const template = WEEKLY_QUEST_POOL[Math.floor(Math.random() * WEEKLY_QUEST_POOL.length)];
            newActiveQuests.push({
                ...template,
                id: `w_${Date.now()}_${i}`,
                category: QuestCategory.WEEKLY,
                rewardGold: 200,
                rewardExp: 100,
                rewardItem: generateRandomItem(gameState.character!.level, ItemRarity.UNCOMMON),
                completed: false
            });
        }
        weeklyResetTime = Date.now();
    }

    newActiveQuests = newActiveQuests.filter(q => q.category !== QuestCategory.EVENT);

    EVENT_DEFINITIONS.forEach((evt, i) => {
        if (evt.dateMatch(now)) {
            const exists = newActiveQuests.find(q => q.title === evt.quest.title) || gameState.completedQuestIds.includes(`evt_${i}`);
            if (!exists) {
                newActiveQuests.push({
                    ...evt.quest,
                    id: `evt_${i}`,
                    category: QuestCategory.EVENT,
                    rewardGold: 1000,
                    rewardExp: 500,
                    rewardItem: evt.rewardItem,
                    completed: false
                });
            }
        }
    });

    if (isNewDay || isNewWeek || isForceInit) {
        updateState({
            activeQuests: newActiveQuests,
            lastDailyReset: dailyResetTime,
            lastWeeklyReset: weeklyResetTime,
            character: { ...gameState.character!, ...charUpdates }
        });
    }
  };

  const addOneTimeQuest = () => {
      const template = ONETIME_QUEST_POOL[Math.floor(Math.random() * ONETIME_QUEST_POOL.length)];
      const diff = template.difficulty;
      let item = null;
      if (diff >= 3) item = generateRandomItem(gameState.character!.level, template.rarity);

      const newQuest: Quest = {
          ...template,
          id: `ot_${Date.now()}`,
          category: QuestCategory.ONETIME,
          rewardGold: 100 * diff,
          rewardExp: 50 * diff,
          rewardItem: item || undefined,
          completed: false
      };

      updateState({ activeQuests: [...gameState.activeQuests, newQuest] });
      addNotification("Новое разовое задание!");
  };

  const initCompletion = (questId: string) => {
      setReflectionQuestId(questId);
  }

  const completeQuest = (mood: JournalEntry['mood']) => {
    if (!reflectionQuestId) return;
    const questIndex = gameState.activeQuests.findIndex(q => q.id === reflectionQuestId);
    if (questIndex === -1) return;

    const quest = gameState.activeQuests[questIndex];
    if (quest.completed) return;

    const char = { ...gameState.character! };
    
    // Formula: HonestyMultiplier = 0.8 + Honesty / 500
    const honestyMult = 0.8 + (char.honesty / 500);

    // Formula: QuestRarity Values: Daily=0, Weekly=1, OneTime=2, Event=3
    let rarityVal = 0;
    if (quest.category === QuestCategory.WEEKLY) rarityVal = 1;
    if (quest.category === QuestCategory.ONETIME) rarityVal = 2;
    if (quest.category === QuestCategory.EVENT) rarityVal = 3;

    // Formula: RewardXP = Base * (1 + Rarity/10) * (1 + Level/50)
    const baseExp = quest.rewardExp;
    const finalExp = Math.floor(baseExp * (1 + rarityVal/10) * (1 + char.level/50));

    // Formula: RewardGold = Base * (1 + Rarity/5) * HonestyMultiplier
    const baseGold = quest.rewardGold;
    const finalGold = Math.floor(baseGold * (1 + rarityVal/5) * honestyMult);

    char.gold += finalGold;
    char.currentExp += finalExp;

    // Reputation Formula: Value * (1 + Honesty/100) * MoodMult
    let questRepValue = 5; // Default Heroism
    if (quest.reputationType === ReputationType.DISCIPLINE) questRepValue = 3;
    
    let moodMult = 1.0;
    if (mood === 'Inspired') moodMult = 1.2;
    if (mood === 'Regret') moodMult = 0.8;
    
    const repChange = Math.floor(questRepValue * (1 + char.honesty/100) * moodMult);
    char.reputation[quest.reputationType] += repChange;

    if (quest.rewardItem) {
        if (char.inventory.length < char.inventorySlots) {
            char.inventory.push({ ...quest.rewardItem, id: Math.random().toString() });
        } else {
            addNotification("Инвентарь полон! Награда потеряна.");
        }
    }

    if (quest.category === QuestCategory.DAILY) {
        char.dailyStreak = (char.dailyStreak || 0) + 1; 
        if (char.dailyStreak % 7 === 0) {
            addNotification("Серия 7 дней! +10 к Честности!");
            char.honesty = Math.min(100, char.honesty + 10);
        }
    }
    
    // Journal bonus to honesty
    char.honesty = Math.min(100, char.honesty + 1);

    const newEntry: JournalEntry = {
        id: Date.now().toString(),
        date: Date.now(),
        text: `Выполнено: ${quest.title}. (${quest.category})`,
        mood: mood
    };
    char.journal = [newEntry, ...char.journal];

    const xpNeeded = XP_TO_LEVEL(char.level);
    if (char.currentExp >= xpNeeded) {
        char.level++;
        char.currentExp -= xpNeeded;
        char.maxHp += 10;
        char.hp = char.maxHp;
        // Basic stats bump, Points are logic for UI usually, but we assume allocation happens later or auto-distribute?
        // For simplicity, auto-distribute 1 point to VIT to ensure survivability
        char.stats.vit += 1; 
        addNotification(`Уровень повышен! Теперь ${char.level}`);
    }

    let updatedQuests = [...gameState.activeQuests];
    if (quest.category === QuestCategory.ONETIME) {
        updatedQuests = updatedQuests.filter(q => q.id !== quest.id);
    } else {
        updatedQuests[questIndex].completed = true;
    }

    updateState({
        character: char,
        activeQuests: updatedQuests,
        completedQuestIds: [...gameState.completedQuestIds, reflectionQuestId]
    });

    addNotification(`Выполнено! +${finalGold}з +${finalExp}xp`);
    setReflectionQuestId(null);
  };

  const filteredQuests = gameState.activeQuests.filter(q => q.category === activeTab);

  const getTabColor = (cat: QuestCategory) => {
      switch(cat) {
          case QuestCategory.DAILY: return 'border-b-4 border-yellow-600 text-yellow-400';
          case QuestCategory.WEEKLY: return 'border-b-4 border-blue-600 text-blue-400';
          case QuestCategory.ONETIME: return 'border-b-4 border-gray-500 text-gray-300';
          case QuestCategory.EVENT: return 'border-b-4 border-purple-600 text-purple-400';
          default: return '';
      }
  };

  return (
    <div className="h-full p-4 overflow-y-auto relative flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-[#e6c35c] pb-4">
        <h2 className="text-xl text-[#e6c35c] uppercase tracking-widest text-shadow">
          Доска Заданий
        </h2>
        {activeTab === QuestCategory.ONETIME && (
             <button 
                onClick={addOneTimeQuest}
                className="pixel-btn"
            >
                + Задание
            </button>
        )}
      </div>

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          {Object.values(QuestCategory).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`text-[10px] uppercase py-2 transition-colors hover:text-white ${activeTab === cat ? getTabColor(cat) : 'text-gray-500'}`}
              >
                  {cat}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-4">
        {filteredQuests.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
                {activeTab === QuestCategory.EVENT ? "Сейчас нет активных событий." : "Заданий нет. Время отдохнуть."}
            </div>
        )}
        
        {filteredQuests.map((quest) => (
          <div 
            key={quest.id}
            className={`relative p-4 bg-[#3a3442] text-[#f8f8f2] border-l-4 shadow-lg transition-transform hover:translate-x-1 ${quest.completed ? 'opacity-50 grayscale' : ''}`}
            style={{ 
                borderLeftColor: RARITY_COLORS[quest.rarity]
            }}
          >
            <div className="flex justify-between items-start mb-2">
                <div>
                     <h3 className="font-bold text-sm mb-1">{quest.title}</h3>
                     <div className="flex gap-2">
                        <span 
                            className="text-[8px] uppercase tracking-wider"
                            style={{ color: RARITY_COLORS[quest.rarity] }}
                        >
                            {quest.rarity}
                        </span>
                        <span className="text-[8px] text-gray-400">Сложность: {quest.difficulty}/6</span>
                     </div>
                </div>
                {quest.category === QuestCategory.EVENT && <span className="text-xl animate-pulse">🎉</span>}
            </div>
            
            <p className="text-xs mb-4 text-gray-300 font-sans leading-relaxed">{quest.description}</p>
            
            <div className="flex justify-between items-center border-t border-gray-600 pt-3">
                <div className="text-xs flex gap-3 text-[#e6c35c]">
                    <span>💰 {quest.rewardGold}</span>
                    <span>✨ {quest.rewardExp} XP</span>
                    {quest.rewardItem && <span className="text-[#bd93f9]">🎁 {quest.rewardItem.name}</span>}
                </div>
                
                {!quest.completed ? (
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" className="w-4 h-4 accent-[#e6c35c] cursor-pointer" id={`check_${quest.id}`} />
                            <span className="text-[10px] text-gray-400 group-hover:text-white">Честно?</span>
                        </label>
                        <button
                            onClick={() => {
                                const cb = document.getElementById(`check_${quest.id}`) as HTMLInputElement;
                                if (cb?.checked) {
                                    initCompletion(quest.id);
                                } else {
                                    addNotification("Подтверди честность выполнения!");
                                }
                            }}
                            className="pixel-btn py-1 px-2"
                        >
                            ГОТОВО
                        </button>
                    </div>
                ) : (
                    <div className="text-[#50fa7b] font-bold text-xs uppercase tracking-widest border border-[#50fa7b] px-2 py-1 rotate-[-5deg]">
                        ВЫПОЛНЕНО
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {reflectionQuestId && (
          <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="retro-container p-6 w-full max-w-sm text-center">
                  <h3 className="text-[#e6c35c] mb-4 text-sm uppercase">Рефлексия</h3>
                  <p className="text-xs mb-6 text-gray-300">Что ты чувствуешь после выполнения?</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <button onClick={() => completeQuest('Inspired')} className="pixel-btn hover:bg-yellow-900">🤩 Вдохновение</button>
                      <button onClick={() => completeQuest('Tired')} className="pixel-btn hover:bg-blue-900">😴 Усталость</button>
                      <button onClick={() => completeQuest('Neutral')} className="pixel-btn hover:bg-gray-700">😐 Спокойствие</button>
                      <button onClick={() => completeQuest('Regret')} className="pixel-btn hover:bg-red-900">😞 Сожаление</button>
                  </div>
                  <button onClick={() => setReflectionQuestId(null)} className="text-[10px] text-gray-500 hover:text-white underline">Отмена</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default QuestBoard;