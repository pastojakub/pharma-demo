import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { FormField } from '../../ui/FormField';
import { Batch } from '../../../types';

interface OfferModalProps {
  selectedBatch: Batch;
  offerPrice: number;
  setOfferPrice: (price: number) => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  selectedBatch,
  offerPrice,
  setOfferPrice,
}) => {
  return (
    <div className="space-y-8">
      <div className="p-8 bg-gray-100 rounded-[3rem] border border-gray-200 flex justify-between items-center">
        <div className="flex-1">
          <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">
            Požadované množstvo
          </label>
          <p className="text-4xl font-black text-black">
            {selectedBatch?.quantity} {selectedBatch?.unit}
          </p>
        </div>
        <ShoppingCart size={40} className="text-gray-300" />
      </div>
      <FormField
        label="Cenová ponuka (€)"
        value={String(offerPrice)}
        type="number"
        onChange={(v: string) => setOfferPrice(Number(v))}
      />
      <p className="text-gray-400 text-xs italic bg-gray-50 p-4 rounded-2xl border border-gray-100 font-bold">
        Dáta budú uložené v DB pre negociáciu a po akceptácii zapísané do súkromného BC kanála.
      </p>
    </div>
  );
};
