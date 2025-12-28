import React, { useState } from 'react';
import { GameState, Item, Recipe, ItemType, ItemRarity } from '../types';
import { RECIPES, MATERIALS, RARITY_COLORS, generateUUID } from '../constants';
import { addItemToInventory } from '../services/game';

interface Props {
  gameState: GameState;
  updateState: (s: Partial<GameState>) => void;
  addNotification: (msg: string) => void;
}

const Crafting: React.FC<Props> = ({ gameState, updateState, addNotification }) => {
  const [tab, setTab] = useState<'RECIPES' | 'MATERIALS'>('RECIPES');

  const getMaterialCount = (matName: string) => {
      // Sum up amounts
      return gameState.character!.inventory
        .filter(i => i.name === matName)
        .reduce((sum, item) => sum + (item.amount || 1), 0);
  };

  const craftItem = (recipe: Recipe) => {
      let char = gameState.character!;
      
      if (char.level < recipe.resultItem.levelReq) {
          addNotification(`Требуется уровень ${recipe.resultItem.levelReq}!`);
          return;
      }

      if (char.gold < recipe.goldCost) {
          addNotification("Недостаточно золота для работы!");
          return;
      }

      for (const mat of recipe.materials) {
          if (getMaterialCount(mat.name) < mat.count) {
              addNotification(`Не хватает ресурса: ${mat.name}`);
              return;
          }
      }

      if (char.inventory.length >= char.inventorySlots && !recipe.resultItem.stackable) {
          addNotification("Нет места для нового предмета!");
          return;
      }

      // Consume Materials logic hardened
      const newInv = [...char.inventory];
      for (const mat of recipe.materials) {
          let needed = mat.count;
          // Iterate backwards to safely remove or reduce items
          for (let i = newInv.length - 1; i >= 0; i--) {
              if (needed <= 0) break;
              
              if (newInv[i].name === mat.name) {
                  const itemAmt = newInv[i].amount || 1;
                  if (itemAmt > needed) {
                      // Partial consumption
                      newInv[i] = { ...newInv[i], amount: itemAmt - needed };
                      needed = 0;
                  } else {
                      // Full consumption of stack
                      needed -= itemAmt;
                      newInv.splice(i, 1);
                  }
              }
          }
      }

      char.gold -= recipe.goldCost;
      char.inventory = newInv;

      // Add Result
      const newItem = { ...recipe.resultItem, id: generateUUID() };
      const updatedChar = addItemToInventory(char, newItem);

      updateState({ character: updatedChar });
      addNotification(`Создано: ${newItem.name}`);
  };

  const userMaterials = gameState.character!.inventory.filter(i => i.type === ItemType.MATERIAL);

  return (
    <div className="h-full flex flex-col bg-[#2a2630]">
        <div className="flex bg-[#1a181e] border-b-2 border-black">
            <button
                onClick={() => setTab('RECIPES')}
                className={`flex-1 py-3 text-[10px] uppercase transition-colors ${tab === 'RECIPES' ? 'text-[#e6c35c] border-b-2 border-[#e6c35c]' : 'text-gray-500 hover:text-white'}`}
            >
                Чертежи
            </button>
            <button
                onClick={() => setTab('MATERIALS')}
                className={`flex-1 py-3 text-[10px] uppercase transition-colors ${tab === 'MATERIALS' ? 'text-[#e6c35c] border-b-2 border-[#e6c35c]' : 'text-gray-500 hover:text-white'}`}
            >
                Ресурсы
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            {tab === 'RECIPES' && (
                <div className="grid gap-4">
                    {RECIPES.map(recipe => {
                        const isLocked = gameState.character!.level < recipe.resultItem.levelReq;
                        const canAfford = gameState.character!.gold >= recipe.goldCost;
                        
                        return (
                        <div key={recipe.id} className={`bg-[#3a3442] p-4 border border-gray-600 relative shadow-md transition-all ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                            {isLocked && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
                                    <div className="bg-black/80 px-3 py-1 text-red-400 text-xs font-bold border border-red-500">
                                        🔒 УРОВЕНЬ {recipe.resultItem.levelReq}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-bold text-xs flex items-center gap-2" style={{ color: RARITY_COLORS[recipe.resultItem.rarity] }}>
                                    <span className="text-xl">{recipe.resultItem.icon}</span> 
                                    {recipe.resultItem.name}
                                </div>
                                <button 
                                    onClick={() => craftItem(recipe)}
                                    disabled={isLocked}
                                    className={`pixel-btn py-1 px-3 text-[10px] ${canAfford ? 'border-orange-500 text-orange-400 hover:bg-orange-900/40' : 'border-gray-500 text-gray-500 cursor-not-allowed'}`}
                                >
                                    СОЗДАТЬ ({recipe.goldCost}з)
                                </button>
                            </div>
                            <div className="text-[10px] text-gray-400 mb-3 italic font-sans">{recipe.resultItem.effect || 'Без эффектов'}</div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#1a181e] p-2 border border-gray-700">
                                {recipe.materials.map((mat, i) => {
                                    const have = getMaterialCount(mat.name);
                                    const hasEnough = have >= mat.count;
                                    return (
                                        <div key={i} className={`flex justify-between ${hasEnough ? 'text-[#50fa7b]' : 'text-[#ff5555]'}`}>
                                            <span>{mat.name}</span>
                                            <span>{have}/{mat.count}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )})}
                </div>
            )}

            {tab === 'MATERIALS' && (
                <div className="grid grid-cols-3 gap-3">
                    {userMaterials.length === 0 && <div className="col-span-3 text-center text-gray-500 text-xs mt-10">Рюкзак для материалов пуст.</div>}
                    {userMaterials.map((mat, i) => (
                        <div key={i} className="bg-[#1a181e] p-3 border border-gray-700 text-center hover:border-gray-500 transition-colors relative">
                            <div className="text-2xl mb-2">{mat.icon}</div>
                            <div className="text-[10px] truncate font-bold mb-1" style={{color: RARITY_COLORS[mat.rarity]}}>{mat.name}</div>
                            {mat.amount && mat.amount > 1 && <div className="absolute top-1 right-1 bg-black/80 px-1 text-[9px] border border-gray-600 rounded">x{mat.amount}</div>}
                            <div className="text-[8px] text-gray-600 uppercase tracking-wider">{mat.materialType}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default Crafting;