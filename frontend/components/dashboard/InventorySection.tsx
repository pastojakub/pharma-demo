import React from 'react';
import { Info, Edit2, Plus, Box, ImageIcon, ChevronRight, ShoppingCart } from 'lucide-react';
import { Batch, DrugDefinition, User } from '../../types';

interface InventorySectionProps {
  groupedData: any[];
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  handleAction: (type: string, batch?: Batch, drug?: DrugDefinition, tab?: 'details' | 'batches') => void;
  user: User;
  backendUrl: string;
}

export const InventorySection: React.FC<InventorySectionProps> = ({
  groupedData,
  handleAction,
  user,
  backendUrl
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[3rem] border border-gray-200 overflow-hidden shadow-xl animate-in fade-in duration-500">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Katalóg produktov</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Skladové zásoby podľa druhu liečiva</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-black text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter">
              {groupedData.length} POLOŽIEK
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50/50 border-b border-gray-200">
            <tr>
              <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400">Produkt</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Katalóg ID</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Celkové zásoby</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 text-right">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groupedData.map(([drugId, group]: any) => {
              const totalQty = group.batches.reduce((sum: number, b: Batch) => sum + b.quantity, 0);
              const unit = group.batches[0]?.unit || 'ks';
              
              const galleryFile = group.drug?.files?.find((f: any) => f.category === 'GALLERY');
              const imageUrl = galleryFile 
                ? (galleryFile.url.startsWith('http') ? galleryFile.url : backendUrl + galleryFile.url)
                : null;

              return (
                <tr 
                  key={drugId} 
                  className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                  onClick={() => handleAction('INFO', undefined, group.drug, 'details')}
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden group-hover:scale-105 transition-all">
                        {imageUrl ? (
                          <img src={imageUrl} className="w-full h-full object-cover"/>
                        ) : (
                          <ImageIcon className="text-gray-300" size={20}/>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg leading-tight">{group.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.drug?.manufacturer || 'Výrobca neuvedený'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-mono font-black text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg text-xs">#{drugId}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      <Box size={16} className="mr-2 text-gray-400"/>
                      <span className="font-black text-gray-900 text-lg">{totalQty}</span>
                      <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">{unit}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction('INFO', undefined, group.drug, 'details'); }}
                        className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 transition-all flex items-center shadow-sm"
                      >
                        <Info size={14} className="mr-2 text-gray-400"/> DETAIL PRODUKTU
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction('INFO', undefined, group.drug, 'batches'); }}
                        className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 transition-all flex items-center shadow-lg"
                      >
                        ZOBRAZIŤ ŠARŽE <ChevronRight size={14} className="ml-1"/>
                      </button>
                      {user.role === 'pharmacy' && totalQty > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAction('SELL', undefined, group.drug); }}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-700 transition-all flex items-center shadow-lg"
                        >
                          <ShoppingCart size={14} className="mr-2"/> PREDAŤ
                        </button>
                      )}
                      {user.role === 'manufacturer' && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAction('EDIT_DRUG', undefined, group.drug); }}
                            className="p-2 bg-gray-100 text-gray-400 rounded-xl hover:text-black hover:bg-gray-200 transition-all"
                            title="Upraviť v katalógu"
                          >
                            <Edit2 size={16}/>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAction('CREATE_BATCH', undefined, group.drug); }}
                            className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all"
                            title="Vytvoriť novú šaržu"
                          >
                            <Plus size={16}/>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        
        {groupedData.length === 0 && (
          <div className="py-32 text-center">
            <Box size={60} className="mx-auto text-gray-200 mb-4"/>
            <p className="text-gray-400 font-bold italic">V sklade sa nenachádzajú žiadne produkty.</p>
          </div>
        )}
      </div>
    </div>
  );
};
