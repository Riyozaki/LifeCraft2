import React, { useState } from 'react';
import { GameState, Item, ItemType, ItemRarity, Equipment } from '../types';
import { HEALTH_POTION, RARITY_COLORS, generateRandomItem } from '../constants';

interface Props {
  gameState: GameState;
  updateState: (s: Partial<GameState>) => void;
  addNotification: (msg: string) => void;
}

const Shop: React.FC<Props> = ({ gameState, updateState, addNotification }) => {
  const [tab, setTab] = useState<'КУПИТЬ' | 'СУМКА' | 'НАСТРОЙКИ'>('КУПИТЬ');
  const [filter, setFilter] = useState<ItemType | 'ALL'>('ALL');

  const buyItem = (item: Item) => {
    const char = gameState.character!;
    
    if (char.inventory.length >= char.inventorySlots) {
        addNotification("Сумка переполнена!");
        return;
    }

    if (char.gold >= item.price) {
        const newChar = { ...char };
        newChar.gold -= item.price;
        newChar.inventory.push({ ...item, id: Math.random().toString(36) }); 
        
        // Reset shop visit streak on purchase
        updateState({ character: newChar, shopVisitStreak: 0 });
        addNotification(`Приобретено: ${item.name}`);
    } else {
        addNotification("Недостаточно золота!");
    }
  };

  const buySlot = () => {
      const char = gameState.character!;
      const cost = 1000;
      if (char.gold >= cost) {
          updateState({ character: { ...char, gold: char.gold - cost, inventorySlots: char.inventorySlots + 5 } });
          addNotification("Сумка расширена (+5 мест)!");
      } else {
          addNotification("Требуется 1000 золота");
      }
  };

  const sellItem = (index: number) => {
      const char = gameState.character!;
      const item = char.inventory[index];
      
      if (item.rarity === ItemRarity.LEGENDARY) {
          addNotification("Легендарные реликвии нельзя продать!");
          return;
      }

      const sellPrice = Math.floor(item.price * 0.3);
      
      const newInv = [...char.inventory];
      newInv.splice(index, 1);
      
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
    const charLevel = gameState.character?.level || 1;
    const streak = gameState.shopVisitStreak || 0;
    const newStreak = streak + 1;

    const discountChance = 15 + charLevel/5 + newStreak/10;
    let discountPct = 0;
    
    if (Math.random() * 100 < discountChance) {
        const totalRep = (Object.values(gameState.character!.reputation) as number[]).reduce((a, b) => a + b, 0);
        const charisma = Math.floor(totalRep / 200);
        discountPct = 10 + Math.floor(Math.random() * 20) + (charisma / 10);
        discountPct = Math.min(50, discountPct);
    }

    const items: Item[] = [];
    
    items.push(HEALTH_POTION);
    items.push(generateRandomItem(charLevel, ItemRarity.COMMON));
    items.push(generateRandomItem(charLevel, ItemRarity.UNCOMMON));

    for(let i=0; i<5; i++) {
        // Allow higher rarity items to appear more frequently in shop for high level players
        const forcedRarity = Math.random() > 0.8 ? ItemRarity.RARE : undefined;
        items.push(generateRandomItem(charLevel, forcedRarity));
    }

    if (discountPct > 0) {
        items.forEach(i => {
            i.price = Math.floor(i.price * (1 - discountPct/100));
        });
        addNotification(`Скидки в лавке! -${Math.floor(discountPct)}%`);
    }

    updateState({ 
        shopItems: items, 
        lastShopUpdate: Date.now(),
        shopVisitStreak: newStreak
    });
  };

  if (gameState.shopItems.length === 0 || Date.now() - gameState.lastShopUpdate > 10 * 60 * 1000) {
      refreshShop();
  }

  const exportSave = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "lifecraft_save.json");
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
                if (parsed.character) {
                    updateState(parsed);
                    addNotification("Сохранение загружено!");
                }
            } catch (err) {
                addNotification("Ошибка файла сохранения");
            }
        };
      }
  };

  const filteredInventory = gameState.character!.inventory.filter(i => filter === 'ALL' || i.type === filter);

  const renderItemCard = (item: Item, action: 'BUY' | 'OWN', index: number) => (
      <div key={index} className="bg-[#3a3442] p-3 border border-gray-700 flex justify-between items-center mb-2 shadow-sm">
          <div>
              <div style={{ color: RARITY_COLORS[item.rarity] }} className="text-xs font-bold mb-1 tracking-wide flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span> {item.name}
              </div>
              <div className="text-[10px] text-gray-400 font-sans leading-tight pl-7">
                  {item.levelReq > 1 && `Ур. ${item.levelReq} • `}
                  {item.classReq && `${item.classReq} • `}
                  {item.stats?.str ? `+${item.stats.str} СИЛ ` : ''}
                  {item.stats?.dex ? `+${item.stats.dex} ЛОВ ` : ''}
                  {item.stats?.int ? `+${item.stats.int} ИНТ ` : ''}
                  {item.stats?.vit ? `+${item.stats.vit} ВЫН ` : ''}
                  {item.healAmount && `Лечит ${item.healAmount} `}
                  {item.effect && <div className="text-[#e6c35c] mt-1">{item.effect}</div>}
              </div>
          </div>
          <div className="flex gap-2 ml-2">
            {action === 'BUY' ? (
                <button 
                    onClick={() => buyItem(item)}
                    className="pixel-btn px-2 py-1 text-[10px]"
                >
                    {item.price}з
                </button>
            ) : (
                <div className="flex flex-col gap-1">
                 <button 
                    onClick={() => equipItem(item, index)}
                    className="pixel-btn px-2 py-1 text-[8px] border-blue-400 text-blue-300"
                >
                    НАДЕТЬ
                </button>
                <button 
                    onClick={() => sellItem(index)}
                    className="pixel-btn px-2 py-1 text-[8px] border-red-400 text-red-300"
                >
                    ПРОДАТЬ {Math.floor(item.price*0.3)}з
                </button>
                </div>
            )}
          </div>
      </div>
  );

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
                    {gameState.shopItems.map((item, i) => renderItemCard(item, 'BUY', i))}
                    <div className="text-center text-[10px] text-gray-600 mt-6 italic">Торговец обновляет товары каждые 10 минут</div>
                </>
            )}

            {tab === 'СУМКА' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                         <div className="text-xs text-gray-400">Слоты: <span className="text-white">{gameState.character!.inventory.length}/{gameState.character!.inventorySlots}</span></div>
                         <button onClick={buySlot} className="pixel-btn px-2 py-1 text-[10px] border-green-600 text-green-400">+5 Мест (1000з)</button>
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