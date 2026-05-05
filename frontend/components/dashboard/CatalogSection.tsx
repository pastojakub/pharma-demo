import React from 'react';
import { Layers, Info, ShoppingCart } from 'lucide-react';
import { Batch, DrugDefinition, User } from '../../types';

interface CatalogSectionProps {
  catalog: DrugDefinition[];
  searchTerm: string;
  backendUrl: string;
  user: User;
  isRegulator: boolean;
  handleAction: (type: string, batch?: Batch, drug?: DrugDefinition, tab?: 'details' | 'batches' | 'pricing') => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  catalog, searchTerm, backendUrl, user, isRegulator, handleAction,
}) => (
  <div className="bg-white rounded-[3rem] border border-gray-200 overflow-hidden shadow-xl animate-in fade-in duration-500">
    <div className="p-8 border-b border-gray-100 bg-gray-50/50">
      <h3 className="text-xl font-black text-gray-900 tracking-tight">Celý katalóg liečiv</h3>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Všetky schválené produkty v sieti</p>
    </div>
    <table className="w-full text-left">
      <thead className="bg-gray-50/50 border-b border-gray-200">
        <tr>
          <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400">Produkt</th>
          <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Katalóg ID</th>
          <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 text-right">Akcie</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {catalog
          .filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((drug) => {
            const thumbnail = drug.files?.find((f) => f.category === 'GALLERY');
            return (
              <tr
                key={drug.id}
                className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                onClick={() => handleAction('INFO', undefined, drug, 'details')}
              >
                <td className="px-10 py-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden">
                      {thumbnail
                        ? <img src={backendUrl + thumbnail.url} className="w-full h-full object-cover" />
                        : <Layers className="text-gray-300" size={20} />}
                    </div>
                    <p className="font-black text-gray-900 text-lg leading-tight">{drug.name}</p>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="font-mono font-black text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg text-xs">#{drug.id}</span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction('INFO', undefined, drug, 'details'); }}
                      className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 transition-all flex items-center shadow-sm"
                    >
                      <Info size={14} className="mr-2 text-gray-400" /> DETAIL PRODUKTU
                    </button>
                    {user.role === 'pharmacy' && !isRegulator && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction('REQUEST', undefined, drug); }}
                        className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 transition-all flex items-center shadow-lg"
                      >
                        <ShoppingCart size={14} className="mr-2" /> OBJEDNAŤ
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
);
