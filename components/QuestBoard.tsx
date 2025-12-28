import React, { useState } from 'react';
import { GameState, Quest, ItemRarity, JournalEntry, QuestCategory, ReputationType, Buff } from '../types';
import { 
    ONETIME_QUEST_POOL, 
    RARITY_COLORS, generateRandomItem, XP_TO_LEVEL, GAME_BALANCE
} from '../constants';
import { addItemToInventory } from '../services/game';

interface Props {
  gameState: GameState;
  updateState: (s: Partial<GameState>) => void;
  addNotification: (msg: string) => void;
}

const QuestBoard: React.FC<Props> = ({ gameState, updateState, addNotification }) => {
  const [activeTab, setActiveTab] = useState<QuestCategory>(QuestCategory.DAILY);
  const [reflectionQuestId, setReflectionQuestId] = useState<string | null>(null);

  const addOneTimeQuest = () => {
      // LIMIT: Max 5 active OneTime quests
      const currentOneTimeCount = gameState.activeQuests.filter(q => q.category === QuestCategory.ONETIME).length;
      if (currentOneTimeCount >= 5) {
          addNotification("Слишком много активных задач (макс. 5)!");
          return;
      }

      const lastOneTime = gameState.activeQuests
        .filter(q => q.category === QuestCategory.ONETIME)
        .sort((a,b) => (b.lastCompletedAt || 0) - (a.lastCompletedAt || 0))[0];
        
      if (lastOneTime && lastOneTime.lastCompletedAt && (Date.now() - lastOneTime.lastCompletedAt) < 2 * 60 * 60 * 1000) {
          addNotification("Обновление раз в 2 часа!");
          return;
      }

      const newQuests: Quest[] = [];

      for(let i=0; i<3; i++) {
        const template = ONETIME_QUEST_POOL[Math.floor(Math.random() * ONETIME_QUEST_POOL.length)];
        const diff = template.difficulty || 1;
        let item = null;
        if (diff >= 3) item = generateRandomItem(gameState.character!.level, template.rarity);

        newQuests.push({
            ...template,
            id: `ot_${Date.now()}_${i}`,
            category: QuestCategory.ONETIME,
            rewardGold: 100 * diff,
            rewardExp: 50 * diff,
            rewardItem: item || undefined,
            completed: false,
            cooldownMs: 7200000 // 2 hours
        } as Quest);
      }

      updateState({ activeQuests: [...gameState.activeQuests, ...newQuests] });
      addNotification("Добавлено 3 новых задачи!");
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

    let char = { ...gameState.character! };
    
    // Check Inventory Space for reward
    if (quest.rewardItem) {
        // Safe check for inventory limit
        if (char.inventory.length >= char.inventorySlots && !quest.rewardItem.stackable) {
             addNotification("Инвентарь полон! Освободите место.");
             return;
        }
    }

    const honestyMult = 0.8 + (char.honesty / 500);

    let rarityVal = 0;
    if (quest.category === QuestCategory.WEEKLY) rarityVal = 1;
    if (quest.category === QuestCategory.ONETIME) rarityVal = 2;
    if (quest.category === QuestCategory.EVENT) rarityVal = 3;

    // LEVEL SCALING: Exponential
    const levelMult = Math.pow(GAME_BALANCE.SCALING.QUEST_GOLD_SCALING, char.level);

    const baseExp = quest.rewardExp;
    const finalExp = Math.floor(baseExp * (1 + rarityVal/10) * levelMult);

    const baseGold = quest.rewardGold;
    const finalGold = Math.floor(baseGold * (1 + rarityVal/5) * honestyMult * levelMult);

    char.gold += finalGold;
    char.currentExp += finalExp;

    let questRepValue = 5; 
    if (quest.reputationType === ReputationType.DISCIPLINE) questRepValue = 3;
    
    let moodMult = 1.0;
    if (mood === 'Inspired') moodMult = 1.2;
    if (mood === 'Regret') moodMult = 0.8;
    
    const repChange = Math.floor(questRepValue * (1 + char.honesty/100) * moodMult);
    char.reputation[quest.reputationType] += repChange;

    // APPLY MOOD BUFF
    const newBuffs = [...gameState.dungeonState.activeBuffs];
    let buffMsg = "";
    
    const addBuffUnique = (name: string, desc: string) => {
        if (!newBuffs.some(b => b.name === name)) {
            newBuffs.push({ id: `buff_${Date.now()}`, name, duration: 1, description: desc });
            buffMsg = `Получен эффект: ${name}!`;
        }
    }

    if (mood === 'Inspired') addBuffUnique('Вдохновение', '+10% Урона на 1 бой');
    else if (mood === 'Neutral') addBuffUnique('Спокойствие', '+10% Защиты на 1 бой');
    
    const newDungeonState = { ...gameState.dungeonState, activeBuffs: newBuffs };

    if (quest.rewardItem) {
        char = addItemToInventory(char, quest.rewardItem);
    }

    if (quest.category === QuestCategory.DAILY) {
        char.dailyStreak = (char.dailyStreak || 0) + 1; 
        if (char.dailyStreak % 7 === 0) {
            addNotification("Серия 7 дней! +10 к Честности!");
            char.honesty = Math.min(100, char.honesty + 10);
        }
    }
    
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
        char.stats.vit += 1; 
        addNotification(`Уровень повышен! Теперь ${char.level}`);
    }

    let updatedQuests = [...gameState.activeQuests];
    updatedQuests[questIndex].completed = true;
    updatedQuests[questIndex].completedToday = true;
    updatedQuests[questIndex].lastCompletedAt = Date.now();

    updateState({
        character: char,
        activeQuests: updatedQuests,
        completedQuestIds: [...gameState.completedQuestIds, reflectionQuestId],
        dungeonState: newDungeonState
    });

    const honestyPercent = Math.floor((honestyMult - 1) * 100);
    const bonusText = honestyPercent !== 0 ? `(Честность ${honestyPercent > 0 ? '+' : ''}${honestyPercent}%)` : '';

    addNotification(`+${finalGold}з ${bonusText}, +${finalExp}xp. ${buffMsg}`);
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
                + Задания (3)
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
                    {/* Show base reward, notification shows actual calculation */}
                    <span>💰 {quest.rewardGold}++</span>
                    <span>✨ {quest.rewardExp}++</span>
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
                  <p className="text-xs mb-2 text-gray-300">Что ты чувствуешь после выполнения?</p>
                  <p className="text-[10px] text-gray-500 mb-6 italic">Настроение дает временный эффект в подземелье.</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <button onClick={() => completeQuest('Inspired')} className="pixel-btn hover:bg-yellow-900 border-yellow-700">🤩 Вдохновение <br/><span className='text-[8px]'>(Урон)</span></button>
                      <button onClick={() => completeQuest('Neutral')} className="pixel-btn hover:bg-gray-700 border-gray-500">😐 Спокойствие <br/><span className='text-[8px]'>(Защита)</span></button>
                      <button onClick={() => completeQuest('Tired')} className="pixel-btn hover:bg-blue-900 border-blue-800">😴 Усталость</button>
                      <button onClick={() => completeQuest('Regret')} className="pixel-btn hover:bg-red-900 border-red-800">😞 Сожаление</button>
                  </div>
                  <button onClick={() => setReflectionQuestId(null)} className="text-[10px] text-gray-500 hover:text-white underline">Отмена</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default QuestBoard;