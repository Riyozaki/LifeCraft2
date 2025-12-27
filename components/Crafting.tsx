import React, { useState } from 'react';
import { GameState, Item, Recipe, ItemType, ItemRarity } from '../types';
import { RECIPES, MATERIALS, RARITY_COLORS } from '../constants';

interface Props {
  gameState: GameState;
  updateState: (s: Partial<GameState>) => void;
  addNotification: (msg: string) => void;
}

const Crafting: React.FC<Props> = ({ gameState, updateState, addNotification }) => {
  const [tab, setTab] = useState<'RECIPES' | 'MATERIALS'>('RECIPES');

  const getMaterialCount = (matName: string) => {
      return gameState.character!.inventory.filter(i => i.name === matName).length;
  };

  const craftItem = (recipe: Recipe) => {
      const char = gameState.character!;
      
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

      if (char.inventory.length >= char.inventorySlots) {
          addNotification("Нет места для нового предмета!");
          return;
      }

      const newInv = [...char.inventory];
      for (const mat of recipe.materials) {
          for (let i = 0; i < mat.count; i++) {
              const idx = newInv.findIndex(item => item.name === mat.name);
              if (idx !== -1) newInv.splice(idx, 1);
          }
      }

      const newItem = { ...recipe.resultItem, id: Math.random().toString() };
      newInv.push(newItem);

      updateState({
          character: {
              ...char,
              gold: char.gold - recipe.goldCost,
              inventory: newInv
          }
      });
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
                    {RECIPES.map(recipe => (
                        <div key={recipe.id} className="bg-[#3a3442] p-4 border border-gray-600 relative shadow-md">
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-bold text-xs flex items-center gap-2" style={{ color: RARITY_COLORS[recipe.resultItem.rarity] }}>
                                    <span className="text-xl">{recipe.resultItem.icon}</span> 
                                    {recipe.resultItem.name}
                                </div>
                                <button 
                                    onClick={() => craftItem(recipe)}
                                    className="pixel-btn py-1 px-3 text-[10px] border-orange-500 text-orange-400 hover:bg-orange-900/40"
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
                    ))}
                </div>
            )}

            {tab === 'MATERIALS' && (
                <div className="grid grid-cols-3 gap-3">
                    {userMaterials.length === 0 && <div className="col-span-3 text-center text-gray-500 text-xs mt-10">Рюкзак для материалов пуст.</div>}
                    {userMaterials.map((mat, i) => (
                        <div key={i} className="bg-[#1a181e] p-3 border border-gray-700 text-center hover:border-gray-500 transition-colors">
                            <div className="text-2xl mb-2">{mat.icon}</div>
                            <div className="text-[10px] truncate font-bold mb-1" style={{color: RARITY_COLORS[mat.rarity]}}>{mat.name}</div>
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