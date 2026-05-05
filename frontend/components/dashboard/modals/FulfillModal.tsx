import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Batch, Fulfillment } from '../../../types';
import { BATCH_STATUS } from '../../../lib/constants';

interface FulfillModalProps {
  selectedBatch: Batch;
  batches: Batch[];
  fulfillmentBatches: Fulfillment[];
  setFulfillmentBatches: (batches: Fulfillment[]) => void;
}

export const FulfillModal: React.FC<FulfillModalProps> = ({
  selectedBatch,
  batches,
  fulfillmentBatches,
  setFulfillmentBatches,
}) => {
  const availableBatches = batches.filter(
    (b) =>
      String(b.drugID) === String(selectedBatch.drugId) &&
      b.status !== BATCH_STATUS.RECALLED &&
      b.status !== BATCH_STATUS.SOLD &&
      b.quantity > 0,
  );

  return (
    <div className="space-y-8">
      <div className="p-8 bg-gray-100 rounded-[3rem] border border-gray-200">
        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">
          Celková požiadavka
        </label>
        <p className="text-3xl font-black text-black">
          {selectedBatch.quantity} {selectedBatch.unit} - {selectedBatch.drugName}
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
          Vybrať šarže na expedíciu
        </label>
        {fulfillmentBatches.map((fb, idx) => (
          <div key={idx} className="flex gap-4 items-end">
            <div className="flex-1">
              <select
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                value={fb.batchID}
                onChange={(e) => {
                  const newFbs = [...fulfillmentBatches];
                  newFbs[idx] = { ...newFbs[idx], batchID: e.target.value };
                  setFulfillmentBatches(newFbs);
                }}
              >
                <option value="">-- Vybrať šaržu --</option>
                {availableBatches.map((b) => (
                  <option key={b.batchID} value={b.batchID}>
                    {b.batchID} (Dostupné: {b.quantity} {b.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <input
                type="number"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                value={fb.quantity}
                onChange={(e) => {
                  const newFbs = [...fulfillmentBatches];
                  newFbs[idx] = { ...newFbs[idx], quantity: Number(e.target.value) };
                  setFulfillmentBatches(newFbs);
                }}
              />
            </div>
            <button
              onClick={() => setFulfillmentBatches(fulfillmentBatches.filter((_, i) => i !== idx))}
              className="p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setFulfillmentBatches([...fulfillmentBatches, { batchID: '', quantity: 0 }])}
          className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl font-bold text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center"
        >
          <Plus size={20} className="mr-2" /> PRIDAŤ ŠARŽU
        </button>
      </div>
    </div>
  );
};
