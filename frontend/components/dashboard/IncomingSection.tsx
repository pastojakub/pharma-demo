import React from 'react';
import { CheckCircle, Truck, Package, Building, Calendar, Box } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { Batch, User } from '../../types';

interface IncomingSectionProps {
  batches: Batch[];
  handleAction: (type: string, batch?: Batch) => void;
  user: User;
}

export const IncomingSection: React.FC<IncomingSectionProps> = ({
  batches,
  handleAction,
  user
}) => {
  const incomingBatches = batches.filter(b => b.status === 'IN_TRANSIT');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[3rem] border border-gray-200 overflow-hidden shadow-xl animate-in fade-in duration-500">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Prichádzajúce šarže</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Šarže na ceste do vášho skladu (vyžadujú prevzatie)</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter">
              {incomingBatches.length} NA CESTE
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400">Produkt / Šarža</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Množstvo</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Pôvod</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Exspirácia</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 text-right">Akcia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-bold">
              {incomingBatches.map((batch) => (
                <tr key={batch.batchID} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                        <Truck size={24}/>
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg leading-tight">{batch.drugName}</p>
                        <p className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">#{batch.batchID}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      <Box size={16} className="mr-2 text-gray-400"/>
                      <span className="text-gray-900">{batch.quantity} {batch.unit}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-gray-600">
                      <Building size={16} className="mr-2 text-gray-400"/>
                      <span className="text-sm">{batch.manufacturer}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-gray-600">
                      <Calendar size={16} className="mr-2 text-gray-400"/>
                      <span className="text-sm">{batch.expiryDate}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleAction('RECEIVE', batch)}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all flex items-center shadow-lg ml-auto"
                    >
                      <CheckCircle size={14} className="mr-2"/> PREVZIAŤ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {incomingBatches.length === 0 && (
          <div className="py-32 text-center">
            <Truck size={60} className="mx-auto text-gray-100 mb-4"/>
            <p className="text-gray-400 font-bold italic">Momentálne nemáte žiadne prichádzajúce šarže.</p>
          </div>
        )}
      </div>
    </div>
  );
};
