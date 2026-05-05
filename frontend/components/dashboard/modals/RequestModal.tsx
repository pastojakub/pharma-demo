import React from 'react';
import { ChevronDown } from 'lucide-react';
import { FormField } from '../../ui/FormField';
import { DrugDefinition, NewBatch } from '../../../types';

interface RequestModalProps {
  newBatch: NewBatch;
  setNewBatch: (batch: NewBatch) => void;
  catalog: DrugDefinition[];
  drugSearch: string;
  setDrugSearch: (search: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  newBatch,
  setNewBatch,
  catalog,
  drugSearch,
  setDrugSearch,
  isDropdownOpen,
  setIsDropdownOpen,
}) => {
  return (
    <div className="space-y-8">
      <div className="relative">
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
          Vybrať liek z katalógu
        </label>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl text-left font-black flex justify-between items-center hover:bg-gray-100 transition-all"
        >
          {newBatch.name || 'Zvoľte produkt...'}
          <ChevronDown />
        </button>
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-3xl shadow-2xl z-[210] overflow-hidden animate-in slide-in-from-top-2">
            <div className="p-3 bg-gray-50 border-b">
              <input
                className="w-full p-3 bg-white border rounded-xl outline-none font-bold focus:border-black"
                placeholder="Rýchle hľadanie..."
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-60 overflow-y-auto font-bold">
              {catalog
                .filter((d) => d.name.toLowerCase().includes(drugSearch.toLowerCase()))
                .map((drug) => (
                  <button
                    key={drug.id}
                    className="w-full p-4 text-left hover:bg-gray-50 hover:text-black border-b border-gray-50 last:border-0 transition-colors"
                    onClick={() => {
                      setNewBatch({ ...newBatch, drugID: String(drug.id), name: drug.name });
                      setIsDropdownOpen(false);
                    }}
                  >
                    {drug.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
          Cieľový Výrobca
        </label>
        <select
          className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none font-black appearance-none cursor-pointer"
          value={newBatch.manufacturer}
          onChange={(e) => setNewBatch({ ...newBatch, manufacturer: e.target.value })}
        >
          <option value="">-- Vybrať dodávateľa --</option>
          <option value="VyrobcaMSP">Vyrobca (Hlavný sklad)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <FormField
          label="Množstvo"
          value={String(newBatch.quantity)}
          type="number"
          onChange={(v: string) => setNewBatch({ ...newBatch, quantity: Number(v) })}
        />
        <FormField
          label="Merná Jednotka"
          value={newBatch.unit}
          placeholder="ks / bal"
          onChange={(v: string) => setNewBatch({ ...newBatch, unit: v })}
        />
      </div>
    </div>
  );
};
