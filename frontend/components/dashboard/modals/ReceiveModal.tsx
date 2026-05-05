import React from 'react';
import { Truck, Package, Building } from 'lucide-react';
import { Batch } from '../../../types';

interface ReceiveModalProps {
  selectedBatch: Batch;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({ selectedBatch }) => {
  return (
    <div className="space-y-8">
      <div className="p-8 bg-blue-600 text-white rounded-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Truck size={100} />
        </div>
        <label className="block text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">
          Prichádzajúca dodávka
        </label>
        <p className="text-3xl font-black tracking-tight">Potvrdiť prevzatie lieku</p>
      </div>

      <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 shadow-inner">
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">
              Produkt
            </label>
            <p className="text-2xl font-black text-black leading-tight">{selectedBatch.drugName}</p>
            <p className="font-mono text-xs font-bold text-gray-400 uppercase mt-1">
              #{selectedBatch.batchID}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">
                Množstvo
              </label>
              <div className="flex items-center text-2xl font-black text-black">
                <Package className="mr-2 text-blue-600" size={24} />
                {selectedBatch.quantity} {selectedBatch.unit}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">
                Odosielateľ
              </label>
              <div className="flex items-center text-lg font-black text-black">
                <Building className="mr-2 text-gray-400" size={20} />
                {selectedBatch.manufacturer}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-400 text-sm italic text-center font-bold px-4">
        Potvrdením tejto akcie zmeníte stav šarže na blockchaine na "DELIVERED" a stane sa súčasťou
        vášho aktívneho skladu.
      </p>
    </div>
  );
};
