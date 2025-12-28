import React, { useState, useEffect } from 'react';
import { GameState, Item, ItemType, ItemRarity, Equipment, ReputationType } from '../types';
import { HEALTH_POTION, RARITY_COLORS, generateRandomItem, generateUUID } from '../constants';
import { isValidGameState } from '../services/storage';
import { addItemToInventory } from '../services/game';

interface Props {
  gameState: GameState;
  updateState: (s: Partial<GameState>) => void;
  addNotification: (msg: string) => void;
}

const Shop: React.FC<Props> = ({ gameState, updateState, addNotification }) => {
  const [tab, setTab] = useState<'КУПИТЬ' | 'СУМКА' | 'НАСТРОЙКИ'>('КУПИТЬ');
  const [filter, setFilter] = useState<ItemType | 'ALL'>('ALL');

  const buyItem = (item: Item) => {
    let char = gameState.character!;
    
    // Check Discount
    const discountPct = gameState.shopState.discounts[item.id] || 0;
    const finalPrice = Math.floor(item.price * (1 - discountPct / 100));

    if (char.gold >= finalPrice) {
        // Use stacking helper
        char.gold -= finalPrice;
        const updatedChar = addItemToInventory(char, { ...item, id: generateUUID() });
        
        if (updatedChar === char) {
             addNotification("Сумка переполнена!");
             return; 
        }

        updateState({ 
            character: updatedChar, 
            shopState: { ...gameState.shopState, visitStreak: 0 }
        });
        addNotification(`Приобретено: ${item.name}`);
    } else {
        addNotification("Недостаточно золота!");
    }
  };

  const buySlot = () => {
      const char = gameState.character!;
      const cost = Math.floor(Math.pow(char.inventorySlots - 15, 2) * 10);
      
      if (char.gold >= cost) {
          updateState({ character: { ...char, gold: char.gold - cost, inventorySlots: char.inventorySlots + 5 } });
          addNotification("Сумка расширена (+5 мест)!");
      } else {
          addNotification(`Требуется ${cost} золота`);
      }
  };

  const sellItem = (index: number) => {
      const char = gameState.character!;
      const item = char.inventory[index];
      
      if (item.rarity === ItemRarity.LEGENDARY) {
          addNotification("Легендарные реликвии нельзя продать!");
          return;
      }

      if ([ItemRarity.RARE, ItemRarity.EPIC].includes(item.rarity)) {
          if (!window.confirm(`Продать ${item.name} (${item.rarity})? Это действие нельзя отменить.`)) {
              return;
          }
      }

      const sellPrice = Math.floor(item.price * 0.3);
      
      const newInv = [...char.inventory];
      // Reduce amount if stacked
      if (item.amount && item.amount > 1) {
          newInv[index] = { ...item, amount: item.amount - 1 };
      } else {
          newInv.splice(index, 1);
      }
      
      const newChar = { ...char, gold: char.gold + sellPrice, inventory: newInv };
      updateState({ character: newChar });
      addNotification(`Продано: ${item.name} (+${sellPrice}з)`);
  };

  const equipItem = (item: Item, index: number) => {
      const char = gameState.character!;
      if (char.level < item.levelReq) {
          addNotification(`Нужен уровень ${item.levelReq}!`);
          return;
      }
      if (item.classReq && item.classReq !== char.classType) {
          addNotification(`Только для класса ${item.classReq}!`);
          return;
      }
      if ([ItemType.POTION, ItemType.SCROLL, ItemType.FOOD].includes(item.type)) {
           addNotification("Это используется в бою или из инвентаря!");
           return;
      }

      let slot: keyof Equipment | null = null;
      switch (item.type) {
          case ItemType.WEAPON: slot = 'weapon'; break;
          case ItemType.HEAD: slot = 'head'; break;
          case ItemType.BODY: slot = 'body'; break;
          case ItemType.HANDS: slot = 'hands'; break;
          case ItemType.LEGS: slot = 'legs'; break;
          case ItemType.RING: slot = 'ring'; break;
          case ItemType.AMULET: slot = 'amulet'; break;
          case ItemType.BELT: slot = 'belt'; break;
      }

      if (!slot) return;
      
      const currentEquip = char.equipment[slot];
      const newInv = [...char.inventory];
      
      // Remove from inventory
      newInv.splice(index, 1);
      
      if (currentEquip) {
          newInv.push(currentEquip);
      }
      
      const newChar = {
          ...char,
          inventory: newInv,
          equipment: {
              ...char.equipment,
              [slot]: item
          }
      };
      
      updateState({ character: newChar });
      addNotification(`Экипировано: ${item.name}`);
  };

  const refreshShop = () => {
    const char = gameState.character!;
    const charLevel = char.level || 1;
    
    // REPUTATION BASED DISCOUNTS
    const discounts: Record<string, number> = {};
    const repHeroism = char.reputation[ReputationType.HEROISM] || 0;
    const repDiscipline = char.reputation[ReputationType.DISCIPLINE] || 0;
    const repCreativity = char.reputation[ReputationType.CREATIVITY] || 0;

    const discountHero = Math.min(25, Math.floor(repHeroism / 50) * 5);
    const discountDisc = Math.min(25, Math.floor(repDiscipline / 50) * 5);
    const discountCreat = Math.min(25, Math.floor(repCreativity / 50) * 5);

    const items: Item[] = [];
    
    items.push({ ...HEALTH_POTION, id: generateUUID() });
    
    const maxItemLevel = charLevel + 3;

    for(let i=0; i<7; i++) {
        let forcedRarity = undefined;
        if (i < 2) forcedRarity = ItemRarity.COMMON;
        else if (i < 4) forcedRarity = ItemRarity.UNCOMMON;
        else if (i === 6 && charLevel > 10) forcedRarity = ItemRarity.RARE;

        const newItem = { ...generateRandomItem(maxItemLevel, forcedRarity), id: generateUUID() };
        items.push(newItem);

        let appliedDiscount = 0;
        if (newItem.type === ItemType.WEAPON || newItem.type === ItemType.POTION) appliedDiscount = discountHero;
        else if ([ItemType.HEAD, ItemType.BODY, ItemType.HANDS, ItemType.LEGS].includes(newItem.type)) appliedDiscount = discountDisc;
        else if ([ItemType.RING, ItemType.AMULET, ItemType.MATERIAL].includes(newItem.type)) appliedDiscount = discountCreat;

        if (Math.random() < 0.1) appliedDiscount += 10; 

        if (appliedDiscount > 0) {
            discounts[newItem.id] = appliedDiscount;
        }
    }

    updateState({ 
        shopState: {
            items,
            discounts,
            lastUpdate: Date.now(),
            visitStreak: gameState.shopState.visitStreak + 1
        }
    });
  };

  // Safe useEffect
  useEffect(() => {
    // Only refresh if empty or expired
    const expired = Date.now() - gameState.shopState.lastUpdate > 10 * 60 * 1000;
    const empty = gameState.shopState.items.length === 0;

    if (empty || expired) {
        refreshShop();
    }
    // Dependency on lastUpdate ensures it only runs when necessary, 
    // refreshShop updates lastUpdate so it won't loop unless logic is flawed.
    // Logic is: now - lastUpdate > 10min. Update -> lastUpdate = now. Diff = 0. Stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.shopState.lastUpdate, gameState.shopState.items.length]); 

  const exportSave = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `lifecraft_save_lvl${gameState.character?.level}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const importSave = (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if (event.target.files && event.target.files.length > 0) {
        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                if (isValidGameState(parsed)) {
                    updateState(parsed);
                    addNotification("Сохранение успешно загружено!");
                } else {
                    addNotification("Ошибка: Неверный формат файла.");
                }
            } catch (err) {
                addNotification("Ошибка: Файл поврежден.");
            }
        };
      }
  };

  const filteredInventory = gameState.character!.inventory.filter(i => filter === 'ALL' || i.type === filter);

  const getEquippedStat = (type: ItemType, stat: 'str' | 'dex' | 'int' | 'vit'): number => {
      let slot: keyof Equipment | null = null;
      if (type === ItemType.WEAPON) slot = 'weapon';
      if (type === ItemType.HEAD) slot = 'head';
      if (type === ItemType.BODY) slot = 'body';
      if (type === ItemType.HANDS) slot = 'hands';
      if (type === ItemType.LEGS) slot = 'legs';
      
      if (!slot) return 0;
      const eq = gameState.character?.equipment[slot];
      return eq?.stats?.[stat] || 0;
  }

  const renderStatComparison = (item: Item, stat: 'str' | 'dex' | 'int' | 'vit', label: string) => {
      if (!item.stats?.[stat]) return null;
      
      const currentVal = getEquippedStat(item.type, stat);
      const diff = (item.stats[stat] || 0) - currentVal;
      let diffEl = null;
      
      if (diff > 0) diffEl = <span className="text-green-500 ml-1">(+{diff})</span>;
      else if (diff < 0) diffEl = <span className="text-red-500 ml-1">({diff})</span>;

      let color = "text-white";
      if (stat === 'str') color = "text-red-400";
      if (stat === 'dex') color = "text-green-400";
      if (stat === 'int') color = "text-blue-400";
      if (stat === 'vit') color = "text-yellow-400";

      return <div className="flex justify-between"><span>{label}</span><span className={color}>+{item.stats[stat]} {diffEl}</span></div>;
  }

  const renderItemCard = (item: Item, action: 'BUY' | 'OWN', index: number) => {
      const discount = action === 'BUY' ? (gameState.shopState.discounts[item.id] || 0) : 0;
      const finalPrice = Math.floor(item.price * (1 - discount/100));
      const sellPrice = Math.floor(item.price * 0.3);

      return (
      <div key={item.id + index} className="bg-[#3a3442] p-4 border-2 border-gray-700 mb-4 shadow-lg relative group transition-all hover:border-[#e6c35c]">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
               <div className="flex items-center gap-4">
                   <div className="text-3xl bg-[#1a181e] w-12 h-12 flex items-center justify-center border-2 border-gray-600 rounded-lg shadow-inner relative">
                       {item.icon}
                       {item.amount && item.amount > 1 && <span className="absolute bottom-0 right-0 bg-black text-white text-[9px] px-1">{item.amount}</span>}
                   </div>
                   <div>
                       <div style={{ color: RARITY_COLORS[item.rarity] }} className="text-xs font-bold uppercase tracking-wider text-shadow-sm mb-1">
                           {item.name}
                       </div>
                       <div className="text-[10px] text-gray-400 flex items-center gap-2">
                           <span className="bg-[#1a181e] px-2 py-0.5 rounded text-gray-300">{item.type}</span>
                           <span style={{ color: RARITY_COLORS[item.rarity] }} className="opacity-80">{item.rarity}</span>
                       </div>
                   </div>
               </div>
               {discount > 0 && <div className="text-[#e6c35c] text-[10px] font-bold bg-red-900/80 px-2 py-1 rounded border border-red-700 animate-pulse">-{Math.floor(discount)}%</div>}
          </div>

          {/* Stats & Info Container */}
          <div className="bg-[#2a2630] p-3 rounded border border-gray-800 mb-3 text-[10px] space-y-2">
               {/* Requirements */}
               {(item.levelReq > 1 || item.classReq) && (
                   <div className="flex gap-3 text-gray-500 border-b border-gray-700 pb-2">
                       {item.levelReq > 1 && <span>Треб. Уровень: <span className="text-white">{item.levelReq}</span></span>}
                       {item.classReq && <span>Класс: <span className="text-[#d9534f]">{item.classReq}</span></span>}
                   </div>
               )}
               
               {/* Stats Grid with Comparison */}
               <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {renderStatComparison(item, 'str', 'Сила')}
                    {renderStatComparison(item, 'dex', 'Ловкость')}
                    {renderStatComparison(item, 'int', 'Интеллект')}
                    {renderStatComparison(item, 'vit', 'Выносливость')}
               </div>

               {/* Heal/Effect */}
               {item.healAmount && <div className="text-green-400 font-bold border-t border-gray-700 pt-2">💚 Восстанавливает {item.healAmount} HP</div>}
               {item.effect && <div className="text-[#e6c35c] italic border-t border-gray-700 pt-2 leading-relaxed">{item.effect}</div>}
               {item.materialType && <div className="text-gray-500 italic border-t border-gray-700 pt-2">Тип: {item.materialType}</div>}
          </div>

          {/* Footer / Actions */}
          <div className="flex items-center gap-3 mt-auto">
            {action === 'BUY' ? (
                <button 
                    onClick={() => buyItem(item)}
                    className="pixel-btn w-full flex justify-between items-center py-2 px-4 hover:bg-green-900/30 border-green-800/50"
                >
                    <span className="text-gray-300">Купить</span>
                    <span className="text-[#e6c35c] font-bold">{finalPrice} 💰</span>
                </button>
            ) : (
                <>
                {![ItemType.MATERIAL, ItemType.POTION, ItemType.SCROLL, ItemType.FOOD].includes(item.type) && (
                     <button 
                        onClick={() => equipItem(item, index)}
                        className="pixel-btn flex-1 py-2 text-[9px] border-blue-500 text-blue-300 hover:bg-blue-900/20"
                    >
                        НАДЕТЬ
                    </button>
                )}
                
                {[ItemType.POTION, ItemType.SCROLL, ItemType.FOOD].includes(item.type) && (
                    <div className="flex-1 text-center text-[9px] text-gray-500 py-2 border border-dashed border-gray-700">
                        Использовать в бою
                    </div>
                )}
                
                <button 
                    onClick={() => sellItem(index)}
                    className="pixel-btn flex-1 py-2 text-[9px] border-red-500 text-red-300 hover:bg-red-900/20 flex flex-col items-center leading-none justify-center gap-1"
                >
                    <span>ПРОДАТЬ</span>
                    <span className="opacity-70 text-[8px]">{sellPrice} 💰</span>
                </button>
                </>
            )}
          </div>
      </div>
      );
  };

  return (
    <div className="h-full flex flex-col">
        <div className="flex bg-[#1a181e] border-b-2 border-black sticky top-0 z-10">
            {['КУПИТЬ', 'СУМКА', 'НАСТРОЙКИ'].map((t) => (
                <button
                    key={t}
                    onClick={() => setTab(t as any)}
                    className={`flex-1 py-3 text-[10px] uppercase transition-colors ${tab === t ? 'bg-[#3a3442] text-[#e6c35c] border-b-2 border-[#e6c35c]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    {t}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#2a2630]">
            {tab === 'КУПИТЬ' && (
                <>
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
                        <div className="text-[#e6c35c] text-xs">Золото: <span className="text-white text-sm">{gameState.character!.gold}</span></div>
                        <button onClick={refreshShop} className="text-[10px] text-gray-500 hover:text-white underline">Обновить лавку</button>
                    </div>
                    {gameState.shopState.items.map((item, i) => renderItemCard(item, 'BUY', i))}
                    <div className="text-center text-[10px] text-gray-600 mt-6 italic">Торговец обновляет товары каждые 10 минут. Скидки зависят от Репутации.</div>
                </>
            )}

            {tab === 'СУМКА' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                         <div className="text-xs text-gray-400">Слоты: <span className="text-white">{gameState.character!.inventory.length}/{gameState.character!.inventorySlots}</span></div>
                         <button onClick={buySlot} className="pixel-btn px-2 py-1 text-[10px] border-green-600 text-green-400">+5 Мест ({Math.floor(Math.pow(gameState.character!.inventorySlots - 15, 2) * 10)}з)</button>
                    </div>
                    
                    {/* Filter */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        {['ALL', ItemType.WEAPON, ItemType.HEAD, ItemType.BODY, ItemType.POTION].map(f => (
                            <button 
                                key={f} 
                                onClick={() => setFilter(f as any)}
                                className={`text-[10px] px-3 py-1 border transition-colors ${filter === f ? 'bg-[#e6c35c] text-black border-[#e6c35c]' : 'border-gray-600 text-gray-400'}`}
                            >
                                {f === 'ALL' ? 'ВСЕ' : f.substring(0,4)}
                            </button>
                        ))}
                    </div>

                    <div className="mb-6 bg-[#1a181e] p-3 border border-gray-700">
                        <h3 className="text-[#e6c35c] text-xs mb-3 uppercase tracking-widest text-center">Экипировка</h3>
                        <div className="text-[10px] grid grid-cols-2 gap-x-4 gap-y-2">
                            {Object.entries(gameState.character!.equipment).map(([key, val]) => {
                                const item = val as Item | null;
                                return (
                                <div key={key} className="flex justify-between border-b border-gray-800 pb-1">
                                    <span className="text-gray-500 capitalize">{key}:</span>
                                    <span style={{ color: item ? RARITY_COLORS[item.rarity] : '#444' }} className="flex items-center gap-1">
                                        {item ? <>{item.icon} {item.name}</> : '—'}
                                    </span>
                                </div>
                            )})}
                        </div>
                     </div>

                    {filteredInventory.map((item, i) => {
                         const originalIndex = gameState.character!.inventory.indexOf(item);
                         return renderItemCard(item, 'OWN', originalIndex);
                    })}
                </>
            )}

            {tab === 'НАСТРОЙКИ' && (
                <div className="space-y-6 max-w-sm mx-auto mt-4">
                    <h3 className="text-[#e6c35c] text-sm uppercase text-center mb-4">Архивы Героя</h3>
                    <button onClick={exportSave} className="pixel-btn w-full border-blue-500 text-blue-300">Сохранить прогресс</button>
                    
                    <div className="relative border-2 border-dashed border-gray-600 p-6 text-center hover:border-gray-400 transition-colors cursor-pointer group">
                        <p className="text-xs text-gray-500 mb-2 group-hover:text-white">Загрузить файл сохранения</p>
                        <input type="file" onChange={importSave} className="absolute inset-0 opacity-0 cursor-pointer" accept=".json" />
                    </div>

                    <div className="pt-8 border-t border-gray-700">
                         <div className="flex items-center justify-between text-xs">
                             <span className="text-gray-400">Текст</span>
                             <button 
                                onClick={() => {
                                    const s = gameState.character!.settings;
                                    updateState({character: {...gameState.character!, settings: {...s, fontSize: s.fontSize === 'normal' ? 'large' : 'normal'}}});
                                }} 
                                className="pixel-btn py-1 px-3"
                             >
                                 {gameState.character!.settings.fontSize === 'normal' ? 'Средний' : 'Крупный'}
                             </button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Shop;