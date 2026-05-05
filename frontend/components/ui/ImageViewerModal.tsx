import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from './Modal';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: string[];
  index: number;
  onIndexChange: (i: number) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen, onClose, gallery, index, onIndexChange,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={`Obrázok ${index + 1} z ${gallery.length}`}
    zIndex={1000}
    footer={
      <div className="flex w-full gap-4">
        <button
          onClick={() => onIndexChange(index > 0 ? index - 1 : gallery.length - 1)}
          className="p-4 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-4 bg-black text-white font-black rounded-2xl hover:bg-gray-800 transition-all uppercase tracking-widest text-xs"
        >
          ZAVRIEŤ
        </button>
        <button
          onClick={() => onIndexChange(index < gallery.length - 1 ? index + 1 : 0)}
          className="p-4 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    }
  >
    <div className="flex flex-col items-center">
      <div className="w-full max-h-[70vh] overflow-auto bg-white rounded-3xl border border-gray-100 p-2 custom-scrollbar flex items-center justify-center min-h-[400px]">
        {gallery.length > 0 && (
          <img
            src={gallery[index]}
            alt={`Gallery Detail ${index}`}
            className="max-w-full h-auto object-contain rounded-2xl shadow-sm animate-in fade-in zoom-in-95 duration-300"
          />
        )}
      </div>
      {gallery.length > 1 && (
        <div className="flex gap-2 mt-6 overflow-x-auto w-full justify-center pb-2 custom-scrollbar">
          {gallery.map((url, idx) => (
            <button
              key={idx}
              onClick={() => onIndexChange(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 transition-all overflow-hidden ${idx === index ? 'border-black scale-105 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'}`}
            >
              <img src={url} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  </Modal>
);
