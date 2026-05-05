import React from 'react';
import { Clock, User, Package } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { TransactionHistory } from '../../types';

function resolveTimestamp(ts: TransactionHistory['timestamp']): number {
  const secs = typeof ts.seconds === 'number' ? ts.seconds : ts.seconds.low;
  return secs * 1000;
}

interface BlockchainTimelineProps {
  history: TransactionHistory[];
  className?: string;
  maxHeight?: string;
}

export const BlockchainTimeline: React.FC<BlockchainTimelineProps> = ({
  history,
  className = '',
  maxHeight,
}) => (
  <div
    className={`relative space-y-10 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-1.5 before:bg-gray-100 ${maxHeight ? `overflow-y-auto pr-4 custom-scrollbar ${maxHeight}` : ''} ${className}`}
  >
    {history.map((tx, i) => (
      <div key={`${tx.txId}-${i}`} className="relative pl-20 pb-2">
        <div className="absolute left-5 top-2 w-7 h-7 bg-white border-4 border-black rounded-full z-10 shadow-md" />
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">
                Blockchain Záznam
              </span>
              <div className="flex items-center text-xs text-gray-400 font-bold bg-white px-3 py-1.5 rounded-xl border">
                <Clock size={14} className="mr-2" />
                {new Date(resolveTimestamp(tx.timestamp)).toLocaleString()}
              </div>
            </div>
            <StatusBadge status={tx.data?.status || 'UNKNOWN'} />
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm font-black">
            <div className="flex items-center text-gray-600 bg-white p-4 rounded-2xl border border-gray-100">
              <User size={16} className="mr-3 text-gray-400" /> {tx.data?.ownerOrg || 'N/A'}
            </div>
            <div className="flex items-center text-gray-600 bg-white p-4 rounded-2xl border border-gray-100">
              <Package size={16} className="mr-3 text-gray-400" /> {tx.data?.quantity || 0}{' '}
              {tx.data?.unit}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);
