import React from 'react';
import { RotateCcw } from 'lucide-react';
import { FormField } from '../../ui/FormField';
import { Batch } from '../../../types';

interface TransferModalProps {
  selectedBatch: Batch;
  transferQuantity: number;
  setTransferQuantity: (qty: number) => void;
  targetOrg?: string;
  setTargetOrg?: (org: string) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  selectedBatch,
  transferQuantity,
  setTransferQuantity,
  targetOrg,
  setTargetOrg,
}) => {
  return (
    <div className="space-y-8">
      <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 flex justify-between items-center shadow-inner">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
            Aktuálne na sklade
          </label>
          <p className="text-5xl font-black text-black leading-none">
            {selectedBatch.quantity} {selectedBatch.unit}
          </p>
        </div>
        <RotateCcw size={40} className="text-gray-300" />
      </div>
      <FormField
        label="Množstvo na expedíciu"
        value={String(transferQuantity)}
        type="number"
        onChange={(v: string) => setTransferQuantity(Number(v))}
      />
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
          Cieľová lekáreň (Prijímateľ)
        </label>
        <select
          className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none font-black appearance-none cursor-pointer focus:border-black transition-all"
          value={targetOrg}
          onChange={(e) => setTargetOrg && setTargetOrg(e.target.value)}
        >
          <option value="">-- Vybrať --</option>
          <option value="LekarenAMSP">Lekáreň A</option>
          <option value="LekarenBMSP">Lekáreň B</option>
        </select>
      </div>
    </div>
  );
};
