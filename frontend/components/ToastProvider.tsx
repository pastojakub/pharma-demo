'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-24 right-6 z-[100] flex flex-col gap-4 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto p-5 rounded-2xl shadow-2xl bg-black text-white flex items-center space-x-4 animate-in slide-in-from-right-10 border-l-4 min-w-[300px] ${
              toast.type === 'error' ? 'border-l-red-500' : 
              toast.type === 'info' ? 'border-l-gray-400' : 'border-l-white'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={24} className="text-red-500"/> : 
             toast.type === 'info' ? <Info size={24} className="text-gray-400"/> : 
             <CheckCircle size={24} className="text-white"/>}
            <span className="font-bold tracking-tight flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-gray-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
