import React from 'react';
import { Truck, CheckCircle } from 'lucide-react';
import { StatusBadge } from '../../ui/StatusBadge';
import { IntegrityBadge } from '../../ui/IntegrityBadge';
import { Batch, Fulfillment } from '../../../types';
import { BATCH_STATUS } from '../../../lib/constants';

interface ViewFulfillmentModalProps {
  selectedBatch: Batch;
  fulfillments: Fulfillment[];
  batches: Batch[];
}

export const ViewFulfillmentModal: React.FC<ViewFulfillmentModalProps> = ({
  selectedBatch,
  fulfillments,
  batches,
}) => {
  return (
    <div className="space-y-8">
      <div className="p-8 bg-black text-white rounded-[3rem] flex justify-between items-center overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Truck size={80} />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
            Stav doručenia
          </h4>
          <p className="text-3xl font-black">Informácie o expedícii</p>
        </div>
        {selectedBatch?.integrity && (
          <div className="z-10">
            <IntegrityBadge integrity={selectedBatch.integrity} />
          </div>
        )}
      </div>

      {!selectedBatch?.integrity?.isValid && selectedBatch?.integrity?.mismatches && (
        <div className="p-6 bg-red-50 border border-red-100 rounded-3xl">
          <label className="block text-[10px] font-black text-red-400 uppercase mb-2 tracking-widest">
            Zistené rozdiely
          </label>
          <ul className="space-y-1">
            {selectedBatch.integrity.mismatches.map((m, i) => (
              <li key={i} className="text-xs font-bold text-red-700 flex items-center">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">
          Priradené šarže a ich stav
        </label>
        <div className="max-h-80 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {fulfillments.length > 0 ? (
            fulfillments.map((f, i) => {
              const liveBatch = batches.find((b) => b.batchID === f.batchID);
              const isDelivered =
                liveBatch &&
                (liveBatch.status === BATCH_STATUS.DELIVERED ||
                  liveBatch.status === BATCH_STATUS.OWNED ||
                  liveBatch.status === BATCH_STATUS.SOLD);

              return (
                <div
                  key={i}
                  className={`flex justify-between items-center p-6 border rounded-3xl transition-all ${isDelivered ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}
                >
                  <div>
                    <p className="font-mono font-black text-gray-900 flex items-center">
                      {f.batchID}
                      {isDelivered && <CheckCircle size={14} className="ml-2 text-green-600" />}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {f.quantity} ks {isDelivered ? '• Doručené' : '• Na ceste'}
                    </p>
                  </div>
                  <StatusBadge status={isDelivered ? BATCH_STATUS.DELIVERED : BATCH_STATUS.IN_TRANSIT} />
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-gray-400 font-bold italic">
              Žiadne informácie o doručení.
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest px-4">
        Stav sa automaticky zmení na "Doručené" po potvrdení prevzatia príslušnej šarže.
      </p>
    </div>
  );
};
