import React, { useState, useEffect, useRef } from 'react';
import CharacterCreation from './components/CharacterCreation';
import QuestBoard from './components/QuestBoard';
import Dungeon from './components/Dungeon';
import Shop from './components/Shop';
import Crafting from './components/Crafting';
import { GameState, ReputationType } from './types';
import { loadGame, saveGame } from './services/storage';
import { processGameTick } from './services/game';
import { MOOD_EMOJIS, XP_TO_LEVEL } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeView, setActiveView] = useState<'HUB' | 'DUNGEON' | 'SHOP' | 'QUESTS' | 'CRAFT'>('HUB');
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Ref for debouncing save
  const saveTimeoutRef = useRef<number | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
        try {
            setIsLoading(true);
            // Simulate async load for future-proofing (e.g. IndexedDB)
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const loaded = loadGame();
            if (loaded && loaded.character) {
                // Process tick immediately upon load (offline progress, resets)
                const processed = processGameTick(loaded);
                setGameState(processed);
            } else {
                setGameState(null); // Trigger Char Creation
            }
        } catch (e) {
            console.error("Failed to load game", e);
            setLoadError("Ошибка загрузки сохранения. Попробуйте обновить страницу.");
        } finally {
            setIsLoading(false);
        }
    };
    init();
  }, []);

  // --- DEBOUNCED AUTO-SAVE ---
  useEffect(() => {
    if (!gameState) return;

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
        saveGame(gameState);
    }, 1000); // Save 1 second after last state change

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [gameState]);

  // --- SAFETY: PREVENT ACCIDENTAL CLOSE ---
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (activeView === 'DUNGEON') {
              e.preventDefault();
              e.returnValue = ''; // Legacy support
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeView]);

  const updateState = (updates: Partial<GameState>) => {
    setGameState(prev => {
        if (!prev) return null;
        return { ...prev, ...updates };
    });
  };

  const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  // --- RENDER LOADERS/ERRORS ---
  if (isLoading) {
      return <div className="h-screen bg-[#2a2630] flex items-center justify-center text-[#e6c35c] font-pixel">ЗАГРУЗКА МИРА...</div>;
  }

  if (loadError) {
      return <div className="h-screen bg-[#2a2630] flex items-center justify-center text-red-500 font-pixel">{loadError}</div>;
  }

  if (!gameState) {
    return (
        <CharacterCreation onComplete={(newState) => {
            const processedState = processGameTick(newState);
            setGameState(processedState);
        }} />
    );
  }

  // Safe character access
  const char = gameState.character;
  if (!char) return <div>Ошибка данных персонажа</div>;

  // Large Font Mode check
  const isLargeFont = char.settings?.fontSize === 'large';
  const baseFontSize = isLargeFont ? 'text-base' : 'text-xs';
  
  // XP Calculation
  const nextLevelXp = XP_TO_LEVEL(char.level);
  const xpPercent = Math.min(100, (char.currentExp / nextLevelXp) * 100);

  // Dungeon Mode is Full Screen overlay
  if (activeView === 'DUNGEON') {
      return (
          <div className={`h-screen w-screen bg-[#1a1a1a] text-white font-pixel ${isLargeFont ? 'text-lg' : ''}`}>
              <Dungeon 
                gameState={gameState} 
                updateState={updateState} 
                addNotification={showNotification}
                goHome={() => setActiveView('HUB')}
              />
              {notification && (
                <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-[#e6c35c] text-black text-xs px-4 py-2 border-2 border-white z-50 animate-bounce shadow-lg">
                    {notification}
                </div>
              )}
          </div>
      );
  }

  // Hub / Town View
  return (
    <div className={`h-screen bg-[#2a2630] flex items-center justify-center p-4 ${isLargeFont ? 'text-lg' : ''}`}>
      <div className="retro-container w-full max-w-5xl h-[90vh] flex flex-col md:flex-row shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Left Panel: Navigation & Char Stats */}
        <div className="w-full md:w-1/3 bg-[#1a181e] p-5 flex flex-col border-r-4 border-[#e6c35c] overflow-y-auto">
            <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto bg-[#2a2630] mb-3 border-4 border-[#e6c35c] flex items-center justify-center text-5xl shadow-lg">
                    {char.classType === 'Воин' && '⚔️'}
                    {char.classType === 'Маг' && '🔮'}
                    {char.classType === 'Разведчик' && '🗡️'}
                    {char.classType === 'Целитель' && '🌿'}
                </div>
                <h2 className="text-[#e6c35c] text-xl font-bold mb-1 tracking-wide">{char.name}</h2>
                <div className={`text-gray-500 ${baseFontSize} uppercase tracking-wider`}>Ур.{char.level} {char.classType}</div>
            </div>

            <div className={`space-y-4 mb-8 ${baseFontSize}`}>
                <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>ЖИЗНЬ</span>
                        <span className="text-[#50fa7b]">{char.hp}/{char.maxHp}</span>
                    </div>
                    <div className="w-full bg-gray-800 h-3 border border-gray-600">
                        <div className="bg-[#50fa7b] h-full transition-all duration-500" style={{width: `${(char.hp / char.maxHp)*100}%`}}></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>ОПЫТ</span>
                        <span className="text-[#8be9fd]">{char.currentExp} / {Math.floor(nextLevelXp)}</span>
                    </div>
                     <div className="w-full bg-gray-800 h-2 border border-gray-600">
                        <div className="bg-[#8be9fd] h-full" style={{width: `${xpPercent}%`}}></div>
                    </div>
                </div>
                 <div className="flex justify-between items-center bg-[#2a2630] p-2 border border-gray-700">
                    <span className="text-gray-400 text-[10px]">ЗОЛОТО</span>
                    <span className="text-[#f1fa8c] font-bold">{char.gold}</span>
                </div>
                 <div className="flex justify-between items-center bg-[#2a2630] p-2 border border-gray-700">
                    <span className="text-gray-400 text-[10px]">ЧЕСТНОСТЬ</span>
                    <span className="text-[#bd93f9] font-bold">{char.honesty}%</span>
                </div>
            </div>

            {/* Reputation Section */}
            <div className={`mb-8 border-t border-gray-700 pt-4 ${baseFontSize}`}>
                <h3 className="text-[#e6c35c] mb-3 text-center text-xs uppercase tracking-widest">Репутация</h3>
                {Object.values(ReputationType).map(rep => (
                    <div key={rep} className="flex justify-between mb-2 text-[10px] text-gray-400">
                        <span>{rep}</span>
                        <span className="text-white">{char.reputation?.[rep] || 0}</span>
                    </div>
                ))}
            </div>

            <nav className="flex-1 space-y-3">
                 <button 
                    onClick={() => setActiveView('HUB')}
                    className={`pixel-btn w-full text-left ${activeView === 'HUB' ? 'bg-[#3a3442] border-[#e6c35c]' : 'border-gray-600 text-gray-400'}`}
                >
                    📖 Дневник
                </button>
                <button 
                    onClick={() => setActiveView('QUESTS')}
                    className={`pixel-btn w-full text-left ${activeView === 'QUESTS' ? 'bg-[#3a3442] border-[#e6c35c]' : 'border-gray-600 text-gray-400'}`}
                >
                    📜 Задания
                </button>
                <button 
                    onClick={() => setActiveView('SHOP')}
                    className={`pixel-btn w-full text-left ${activeView === 'SHOP' ? 'bg-[#3a3442] border-[#e6c35c]' : 'border-gray-600 text-gray-400'}`}
                >
                    🛒 Лавка
                </button>
                
                <button 
                    onClick={() => setActiveView('CRAFT')}
                    className={`pixel-btn w-full text-left ${activeView === 'CRAFT' ? 'bg-[#3a3442] border-[#e6c35c]' : 'border-gray-600 text-gray-400'}`}
                >
                    ⚒️ Кузница
                </button>

                <button 
                    onClick={() => setActiveView('DUNGEON')}
                    className="pixel-btn w-full text-left text-[#d9534f] border-[#d9534f] hover:bg-[#d9534f]/10 mt-6"
                >
                    💀 В Поход
                </button>
            </nav>
        </div>

        {/* Right Panel: Dynamic Content */}
        <div className="w-full md:w-2/3 bg-[#2a2630] relative">
            <div className="absolute inset-0 bg-black/5 pointer-events-none z-0 clouds-bg opacity-10"></div>
            
            <div className="relative z-10 h-full overflow-hidden">
                {activeView === 'HUB' && (
                    <div className="h-full flex flex-col p-8 overflow-y-auto">
                        <h2 className="text-[#e6c35c] text-xl mb-6 border-b-2 border-[#e6c35c] pb-3 uppercase tracking-widest text-shadow">Летопись Героя</h2>
                        {char.journal?.length === 0 ? (
                            <div className="text-center mt-20 opacity-50">
                                <p className="text-gray-500 mb-2">Страницы пусты...</p>
                                <p className="text-xs text-gray-600">Выполни первое задание, чтобы начать историю.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {char.journal?.map((entry) => (
                                    <div key={entry.id} className="bg-[#1a181e] p-5 border-l-4 border-[#e6c35c] shadow-md relative">
                                        <div className="flex justify-between text-gray-500 text-[10px] mb-2 font-mono">
                                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                                            <span className="text-xl absolute top-4 right-4" title={entry.mood}>{MOOD_EMOJIS[entry.mood]}</span>
                                        </div>
                                        <p className="italic text-gray-300 font-serif leading-relaxed pr-8">"{entry.text}"</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {activeView === 'QUESTS' && <QuestBoard gameState={gameState} updateState={updateState} addNotification={showNotification} />}
                {activeView === 'SHOP' && <Shop gameState={gameState} updateState={updateState} addNotification={showNotification} />}
                {activeView === 'CRAFT' && <Crafting gameState={gameState} updateState={updateState} addNotification={showNotification} />}
            </div>
        </div>

      </div>

      {/* Global Notification */}
      {notification && (
        <div className="fixed top-10 right-10 bg-[#e6c35c] text-black text-xs font-bold px-6 py-4 border-4 border-white z-50 animate-bounce shadow-[0_0_20px_rgba(230,195,92,0.6)] uppercase tracking-wide">
            {notification}
        </div>
      )}
    </div>
  );
};

export default App;