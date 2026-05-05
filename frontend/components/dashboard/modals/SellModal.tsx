import React from 'react';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { FormField } from '../../ui/FormField';
import { Batch, DrugDefinition, User } from '../../../types';
import { STABLE_BATCH_STATUSES } from '../../../lib/constants';

interface SellModalProps {
  selectedBatch: Batch | null;
  selectedDrug: DrugDefinition | null;
  batches: Batch[];
  user: User | null;
  sellQuantity: number;
  setSellQuantity: (qty: number) => void;
  handleAction: (type: string, batch?: Batch, drug?: DrugDefinition, tab?: 'details' | 'batches' | 'pricing') => void;
}

export const SellModal: React.FC<SellModalProps> = ({
  selectedBatch,
  selectedDrug,
  batches,
  user,
  sellQuantity,
  setSellQuantity,
  handleAction,
}) => {
  if (selectedDrug && !selectedBatch) {
    const availableBatches = batches.filter(
      (b) =>
        String(b.drugID) === String(selectedDrug.id) &&
        b.ownerOrg === user?.org &&
        (STABLE_BATCH_STATUSES as readonly string[]).includes(b.status) &&
        b.quantity > 0,
    );

    return (
      <div className="space-y-6">
        <p className="text-gray-500 font-bold ml-1">Vyberte šaržu na predaj:</p>
        <div className="space-y-4">
          {availableBatches.map((batch) => (
            <button
              key={batch.batchID}
              onClick={() => handleAction('SELL', batch)}
              className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] hover:border-black transition-all text-left flex justify-between items-center group"
            >
              <div>
                <p className="font-mono font-black text-lg group-hover:text-black">
                  {batch.batchID}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Dostupné: {batch.quantity} {batch.unit} • Exspirácia: {batch.expiryDate}
                </p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-black" />
            </button>
          ))}
          {availableBatches.length === 0 && (
            <div className="py-10 text-center text-gray-400 font-bold italic">
              Žiadne dostupné šarže na predaj.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedBatch) return null;

  return (
    <div className="space-y-8">
      <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 flex justify-between items-center shadow-inner">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
            Skladové zásoby
          </label>
          <p className="text-5xl font-black text-black leading-none">
            {selectedBatch.quantity} {selectedBatch.unit}
          </p>
        </div>
        <ShoppingCart size={40} className="text-gray-300" />
      </div>
      <FormField
        label="Množstvo predaného lieku"
        value={String(sellQuantity)}
        type="number"
        onChange={(v: string) => setSellQuantity(Number(v))}
      />
      <p className="text-gray-400 text-sm italic ml-1 font-bold">
        Každý predaj bude permanentne zaevidovaný na blockchaine.
      </p>
    </div>
  );
};
