import React from 'react';
import { Package, History, Eye } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Batch } from '../../types';

interface BatchCardProps {
  batch: Batch;
  onAction: (type: string, batch: Batch) => void;
  role: string;
}

export const BatchCard: React.FC<BatchCardProps> = ({ batch, onAction, role }) => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-50 overflow-hidden hover:translate-y-[-4px] transition-all duration-300 group">
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-gray-50 rounded-2xl text-gray-700 border border-gray-100 group-hover:bg-black group-hover:text-white transition-colors shadow-sm">
            <Package size={24} />
          </div>
          <StatusBadge status={batch.status} />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-1 leading-tight tracking-tight">{batch.batchID}</h3>
        <p className="text-[10px] text-gray-400 font-black uppercase mb-6 tracking-widest">{batch.manufacturer}</p>
        <div className="space-y-4 text-sm bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Na sklade:</span>
            <span className="font-black text-gray-900">{batch.quantity} {batch.unit}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Exspirácia:</span>
            <span className="font-bold text-gray-900">{batch.expiryDate}</span>
          </div>
          {batch.price && (
            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
              <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">{role === 'manufacturer' ? 'Predajná cena:' : 'Kúpna cena:'}</span>
              <span className="font-black text-green-600 text-lg">{batch.price.toFixed(2)}€</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button 
              onClick={() => onAction('HISTORY', batch)} 
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center shadow-sm"
            >
              <History size={18} className="mr-2" /> AUDIT
            </button>
            <button 
              onClick={() => onAction('INFO', batch)} 
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all flex items-center justify-center shadow-sm"
            >
              <Eye size={18} className="mr-2" /> DETAIL
            </button>
          </div>
          <div className="flex gap-2">
            {role === 'pharmacy' && batch.status === 'OFFER_MADE' && (
              <button onClick={() => onAction('APPROVE_OFFER', batch)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-black transition-all">PRIJAŤ PONUKU</button>
            )}
            {role === 'pharmacy' && batch.status === 'DELIVERED' && (
              <button onClick={() => onAction('SELL', batch)} className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-sm shadow-lg hover:bg-gray-800 transition-all">PREDAŤ</button>
            )}
            {role === 'pharmacy' && batch.status === 'IN_TRANSIT' && (
              <button onClick={() => onAction('RECEIVE', batch)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-black transition-all">PRIJAŤ</button>
            )}
            {role === 'manufacturer' && (batch.status === 'INITIALIZED' || batch.status === 'OFFER_MADE' || batch.status === 'RETURNED') && (
              <button onClick={() => onAction('TRANSFER', batch)} className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all shadow-md">EXPEDOVAŤ</button>
            )}
            {role === 'manufacturer' && batch.status === 'REQUESTED' && (
              <button onClick={() => onAction('OFFER', batch)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-md">PONÚKNUŤ CENU</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
