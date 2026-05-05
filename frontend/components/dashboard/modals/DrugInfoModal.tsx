import React from 'react';
import {
  ClipboardList,
  Box,
  ShoppingCart,
  Info,
  FileDown,
  Plus,
} from 'lucide-react';
import { StatusBadge } from '../../ui/StatusBadge';
import { Batch, DrugDefinition, PricingSummary, User } from '../../../types';
import { canPerformAction } from '../../../lib/permissions';

interface DrugInfoModalProps {
  modalTab: 'details' | 'batches' | 'pricing';
  setModalTab: (tab: 'details' | 'batches' | 'pricing') => void;
  selectedDrug: DrugDefinition | null;
  batches: Batch[];
  user: User | null;
  backendUrl: string;
  pricingSummary: PricingSummary[];
  handleAction: (type: string, batch?: Batch, drug?: DrugDefinition, tab?: 'details' | 'batches' | 'pricing') => void;
  setSelectedImage?: (url: string | null) => void;
}

export const DrugInfoModal: React.FC<DrugInfoModalProps> = ({
  modalTab,
  setModalTab,
  selectedDrug,
  batches,
  user,
  backendUrl,
  pricingSummary,
  handleAction,
  setSelectedImage,
}) => {
  return (
    <>
      <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-10 border border-gray-100 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setModalTab('details')}
          className={`flex-1 min-w-[140px] py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all whitespace-nowrap ${modalTab === 'details' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
        >
          <ClipboardList size={16} className="mr-2 flex-shrink-0" /> Informácie
        </button>
        <button
          onClick={() => setModalTab('batches')}
          className={`flex-1 min-w-[140px] py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all whitespace-nowrap ${modalTab === 'batches' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
        >
          <Box size={16} className="mr-2 flex-shrink-0" /> Šarže
        </button>
        {user?.role === 'manufacturer' && (
          <button
            onClick={() => setModalTab('pricing')}
            className={`flex-1 min-w-[140px] py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all whitespace-nowrap ${modalTab === 'pricing' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
          >
            <ShoppingCart size={16} className="mr-2 flex-shrink-0" /> Cenník
          </button>
        )}
      </div>

      {modalTab === 'details' && (
        <div className="space-y-8">
          <div className="bg-black p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Info size={100} />
            </div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
              Informácie o užívaní
            </label>
            <p className="text-3xl font-black leading-tight italic">
              "{selectedDrug?.intakeInfo || 'Informácia nie je k dispozícii.'}"
            </p>
          </div>
          {selectedDrug?.files?.filter((f) => f.category === 'GALLERY').length ? (
            <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
              {selectedDrug.files
                .filter((f) => f.category === 'GALLERY')
                .map((f, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-48 aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 relative cursor-pointer active:scale-95 transition-transform"
                    onClick={() =>
                      setSelectedImage &&
                      setSelectedImage(f.url.startsWith('http') ? f.url : backendUrl + f.url)
                    }
                  >
                    <img
                      src={f.url.startsWith('http') ? f.url : backendUrl + f.url}
                      className="w-full h-full object-cover transition-transform hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[10px] p-2 text-center">
                      KLIKNITE PRE DETAIL
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
                Zloženie
              </label>
              <p className="font-bold text-gray-700 leading-relaxed">
                {selectedDrug?.composition || 'Neuvedené.'}
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">
                Dávkovanie
              </label>
              <p className="font-bold text-gray-700 leading-relaxed">
                {selectedDrug?.recommendedDosage || 'Neuvedené.'}
              </p>
            </div>
          </div>
          {selectedDrug?.files?.find((f) => f.category === 'LEAFLET') && (
            <a
              href={
                selectedDrug.files.find((f) => f.category === 'LEAFLET')!.url.startsWith('http')
                  ? selectedDrug.files.find((f) => f.category === 'LEAFLET')!.url
                  : backendUrl + selectedDrug.files.find((f) => f.category === 'LEAFLET')!.url
              }
              target="_blank"
              className="flex items-center justify-between p-8 bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] group hover:bg-black transition-all shadow-lg shadow-gray-100/50"
            >
              <div className="flex items-center">
                <div className="bg-white p-4 rounded-2xl mr-5 text-black group-hover:bg-gray-800 group-hover:text-white shadow-sm transition-colors">
                  <ClipboardList size={28} />
                </div>
                <div>
                  <p className="font-black text-black group-hover:text-white transition-colors uppercase tracking-tight text-sm">
                    {selectedDrug.files.find((f) => f.category === 'LEAFLET')!.name}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 group-hover:text-gray-300 transition-colors uppercase tracking-widest mt-1">
                    STIAHNUŤ PRÍBALOVÝ LETÁK (PDF)
                  </p>
                </div>
              </div>
              <FileDown className="text-gray-300 group-hover:text-white transition-colors" size={28} />
            </a>
          )}
        </div>
      )}

      {modalTab === 'batches' && (
        <div className="space-y-4">
          {user?.role === 'manufacturer' && (
            <button
              onClick={() => handleAction('CREATE_BATCH', undefined, selectedDrug || undefined)}
              className="w-full p-6 bg-green-50 border-2 border-dashed border-green-100 rounded-3xl font-black text-xs text-green-600 uppercase tracking-widest hover:bg-green-100 hover:border-green-200 transition-all flex items-center justify-center mb-6"
            >
              <Plus size={18} className="mr-2" /> Pridať novú šaržu do skladu
            </button>
          )}
          {batches
            .filter((b) => String(b.drugID) === String(selectedDrug?.id))
            .map((b) => (
              <div
                key={b.batchID}
                className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white transition-all shadow-sm group relative"
              >
                <div className="flex-1 cursor-pointer" onClick={() => handleAction('INFO', b)}>
                  <p className="font-mono font-black text-lg leading-none mb-1">{b.batchID}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {b.quantity} {b.unit} • Exspirácia: {b.expiryDate}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {canPerformAction(b, user) && user?.role === 'pharmacy' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction('SELL', b);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-green-700 transition-all shadow-md"
                    >
                      PREDAŤ
                    </button>
                  )}
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          {batches.filter((b) => String(b.drugID) === String(selectedDrug?.id)).length === 0 && (
            <div className="py-20 text-center text-gray-400 font-bold italic">
              Žiadne aktívne šarže pre tento liek.
            </div>
          )}
        </div>
      )}

      {modalTab === 'pricing' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Lekáreň</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">
                  Dohodnutá Cena
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">
                  Celkový Objem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {pricingSummary.length > 0 ? (
                pricingSummary.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-8 py-5 text-gray-900">{p.pharmacy}</td>
                    <td className="px-8 py-5 text-right font-black text-green-600 text-lg">
                      {p.price.toFixed(2)}€
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="bg-gray-100 px-3 py-1 rounded-lg text-xs font-bold text-gray-500">
                        {p.totalQuantity} ks
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-8 py-10 text-center text-gray-400 font-bold italic">
                    Zatiaľ neboli dohodnuté žiadne ceny.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </>
  );
};
