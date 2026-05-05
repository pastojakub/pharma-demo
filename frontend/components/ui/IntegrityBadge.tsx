import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { IntegrityStatus } from '../../types';

interface IntegrityBadgeProps {
  integrity: IntegrityStatus;
}

export const IntegrityBadge: React.FC<IntegrityBadgeProps> = ({ integrity }) => (
  <div
    className={`p-4 rounded-2xl border-2 flex items-center space-x-3 ${
      integrity.isValid
        ? 'bg-green-900/20 border-green-500/50 text-green-400'
        : 'bg-red-900/20 border-red-500/50 text-red-400'
    }`}
  >
    {integrity.isValid ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
    <span className="text-[10px] font-black uppercase tracking-widest">
      {integrity.isValid ? 'Zhodné' : 'Nesúlad'}
    </span>
  </div>
);
