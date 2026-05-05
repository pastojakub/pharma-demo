import React from 'react';
import {
  Package,
  Info,
  History,
  ArrowRightLeft,
  ShoppingCart,
  CheckCircle,
} from 'lucide-react';
import { ModalHeader } from '../../ui/ModalHeader';
import { Batch, DrugDefinition, User } from '../../../types';
import { canPerformAction } from '../../../lib/permissions';
import { BATCH_STATUS } from '../../../lib/constants';

interface BatchInfoModalProps {
  selectedBatch: Batch;
  user: User | null;
  setModalType: (type: string) => void;
  setModalTab: (tab: 'details' | 'batches' | 'pricing') => void;
  handleAction: (type: string, batch?: Batch, drug?: DrugDefinition, tab?: 'details' | 'batches' | 'pricing') => void;
}

export const BatchInfoModal: React.FC<BatchInfoModalProps> = ({
  selectedBatch,
  user,
  setModalType,
  setModalTab,
  handleAction,
}) => {
  return (
    <div className="space-y-8">
      <ModalHeader
        decorIcon={<Package size={100} />}
        label="Identifikátor šarže"
        title={selectedBatch.batchID}
        titleMono
        status={selectedBatch.status}
        statusLabel={selectedBatch.drugName}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">
            Skladové informácie
          </label>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-gray-200 pb-2">
              <span className="text-sm font-bold text-gray-500">Množstvo</span>
              <span className="text-xl font-black text-black">
                {selectedBatch.quantity} {selectedBatch.unit}
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-200 pb-2">
              <span className="text-sm font-bold text-gray-500">Exspirácia</span>
              <span className="text-lg font-black text-black">{selectedBatch.expiryDate}</span>
            </div>
            {selectedBatch.price && (
              <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                <span className="text-sm font-bold text-gray-500">Cena</span>
                <span className="text-xl font-black text-green-600">
                  {selectedBatch.price.toFixed(2)}€
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">
            Pôvod a vlastníctvo
          </label>
          <div className="space-y-4">
            <div className="flex flex-col border-b border-gray-200 pb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Výrobca</span>
              <span className="text-md font-black text-black">{selectedBatch.manufacturer}</span>
            </div>
            <div className="flex flex-col border-b border-gray-200 pb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Aktuálny vlastník (MSP)</span>
              <span className="text-md font-black text-black">{selectedBatch.ownerOrg}</span>
            </div>
            {selectedBatch.metadata && (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-500 uppercase">Metadáta</span>
                <span className="text-sm font-bold text-gray-700 italic mt-1">
                  {selectedBatch.metadata}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            setModalType('INFO');
            setModalTab('details');
          }}
          className="p-6 bg-white border-2 border-gray-100 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:border-black transition-all flex items-center justify-center group"
        >
          <Info size={18} className="mr-2 text-gray-400 group-hover:text-black transition-colors" /> Karta lieku
        </button>

        <button
          onClick={() => handleAction('HISTORY', selectedBatch)}
          className="p-6 bg-gray-800 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center shadow-lg"
        >
          <History size={18} className="mr-2" /> História
        </button>

        {canPerformAction(selectedBatch, user) && (
          <button
            onClick={() => handleAction('TRANSFER', selectedBatch)}
            className="p-6 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center shadow-lg"
          >
            <ArrowRightLeft size={18} className="mr-2" /> Presunúť
          </button>
        )}

        {canPerformAction(selectedBatch, user) && user?.role === 'pharmacy' && (
          <button
            onClick={() => handleAction('SELL', selectedBatch)}
            className="p-6 bg-green-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center shadow-lg"
          >
            <ShoppingCart size={18} className="mr-2" /> Predať
          </button>
        )}

        {user?.org === selectedBatch.ownerOrg && selectedBatch.status === BATCH_STATUS.IN_TRANSIT && (
          <button
            onClick={() => handleAction('RECEIVE', selectedBatch)}
            className="p-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg"
          >
            <CheckCircle size={18} className="mr-2" /> Prevziať
          </button>
        )}
      </div>
    </div>
  );
};
