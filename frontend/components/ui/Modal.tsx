import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, zIndex }) => {
  if (!isOpen) return null;

  const stackLevel = zIndex ? `z-[${zIndex}]` : 'z-[200]';

  return (
    <div 
      className={`fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500`}
      style={{ zIndex: zIndex || 200 }}
    >
      <div className="bg-white rounded-[3rem] max-w-2xl w-full p-12 shadow-3xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
        <div className="mb-10 flex justify-between items-start">
          <div>
            <h3 className="text-4xl font-black text-slate-900 leading-none mb-3 uppercase tracking-tighter">{title}</h3>
            <div className="h-1.5 w-20 bg-blue-600 rounded-full"></div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-8">
          {children}
        </div>

        {footer && (
          <div className="flex gap-6 mt-16">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
