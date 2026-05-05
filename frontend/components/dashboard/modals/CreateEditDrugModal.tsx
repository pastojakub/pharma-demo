import React from 'react';
import { ImageIcon, FileDown, Trash2, X } from 'lucide-react';
import { FormField } from '../../ui/FormField';
import { NewDrug } from '../../../types';

interface CreateEditDrugModalProps {
  modalType: string;
  newDrug: NewDrug;
  setNewDrug: (drug: NewDrug) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'leaflet' | 'gallery') => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  backendUrl: string;
}

export const CreateEditDrugModal: React.FC<CreateEditDrugModalProps> = ({
  newDrug,
  setNewDrug,
  handleFileUpload,
  fileInputRef,
  galleryInputRef,
  backendUrl,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <FormField
          label="Názov Lieku"
          value={newDrug.name}
          onChange={(v: string) => setNewDrug({ ...newDrug, name: v })}
        />
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
            Produktová Galéria
          </label>
          <div className="space-y-4">
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl font-bold text-gray-400 hover:border-black transition-all flex items-center justify-center"
            >
              <ImageIcon size={20} className="mr-2" /> Pridať fotky
            </button>
            {newDrug.gallery.length > 0 && (
              <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar">
                {newDrug.gallery.map((img, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-20 h-20 relative group rounded-xl overflow-hidden border"
                  >
                    <img
                      src={img.url.startsWith('http') ? img.url : backendUrl + img.url}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() =>
                        setNewDrug({
                          ...newDrug,
                          gallery: newDrug.gallery.filter((_, i) => i !== idx),
                        })
                      }
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            type="file"
            multiple
            className="hidden"
            ref={galleryInputRef}
            onChange={(e) => handleFileUpload(e, 'gallery')}
          />
        </div>
      </div>
      <FormField
        label="Pokyny k užívaniu (Intake Info)"
        value={newDrug.intakeInfo}
        placeholder="Napr. 1 tableta ráno pred jedlom"
        onChange={(v: string) => setNewDrug({ ...newDrug, intakeInfo: v })}
      />
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
            Príbalový Leták (PDF)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl font-bold text-gray-400 hover:border-black transition-all flex items-center justify-center"
            >
              <FileDown size={20} className="mr-2" /> {newDrug.leaflet ? 'Nahradené' : 'Vybrať PDF'}
            </button>
            {newDrug.leaflet && (
              <button
                onClick={() => setNewDrug({ ...newDrug, leaflet: null })}
                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e, 'leaflet')}
          />
        </div>
        <FormField
          label="Odporúčané Dávkovanie"
          value={newDrug.recommendedDosage}
          onChange={(v: string) => setNewDrug({ ...newDrug, recommendedDosage: v })}
        />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">
          Zloženie
        </label>
        <textarea
          className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none focus:border-black font-bold transition-all"
          rows={2}
          value={newDrug.composition}
          onChange={(e) => setNewDrug({ ...newDrug, composition: e.target.value })}
        />
      </div>
    </div>
  );
};
