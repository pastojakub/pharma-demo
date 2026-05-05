import React from 'react';
import { ShieldCheck, ShieldAlert, RotateCcw } from 'lucide-react';
import { BlockchainTimeline } from '../../ui/BlockchainTimeline';
import { Batch, DrugDefinition, IntegrityStatus, TransactionHistory } from '../../../types';

interface HistoryModalProps {
  integrity: IntegrityStatus | null;
  history: TransactionHistory[];
  selectedBatch: Batch | null;
  handleAction: (type: string, batch?: Batch, drug?: DrugDefinition, tab?: 'details' | 'batches' | 'pricing') => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  integrity,
  history,
  selectedBatch,
  handleAction,
}) => {
  return (
    <div className="space-y-10">
      <div
        className={`p-8 rounded-[2.5rem] border-2 flex items-center justify-between space-x-5 ${integrity?.isValid ? 'bg-gray-50 border-gray-200 text-black' : 'bg-red-50 border-red-100 text-red-800'}`}
      >
        <div className="flex items-center space-x-5">
          {integrity?.isValid ? <ShieldCheck size={48} /> : <ShieldAlert size={48} />}
          <div>
            <p className="font-black text-2xl leading-none uppercase tracking-tighter">
              {integrity?.isValid ? 'STAV JE ZHODNÝ S BLOCKCHAINOM' : 'ZISTENÝ NESÚLAD'}
            </p>
            <p className="text-sm font-bold opacity-70 mt-2">
              {integrity?.isValid
                ? 'Dáta v lokálnej databáze sa zhodujú s blockchain ledgerom.'
                : 'Zistený nesúlad údajov medzi lokálnou databázou a blockchainom!'}
            </p>
          </div>
        </div>
        {!integrity?.isValid && selectedBatch && (
          <button
            onClick={() => handleAction('SYNC_BATCH', selectedBatch)}
            className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center"
          >
            <RotateCcw size={14} className="mr-2" /> Opraviť z blockchainu
          </button>
        )}
      </div>

      {!integrity?.isValid && integrity?.mismatches && (
        <div className="p-6 bg-red-50 border border-red-100 rounded-3xl animate-pulse-red">
          <label className="block text-[10px] font-black text-red-400 uppercase mb-2 tracking-widest">
            Kritické rozdiely
          </label>
          <ul className="space-y-1">
            {integrity.mismatches.map((m: string, i: number) => (
              <li key={i} className="text-xs font-bold text-red-700 flex items-center">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <BlockchainTimeline history={history} maxHeight="max-h-[60vh]" />
    </div>
  );
};
