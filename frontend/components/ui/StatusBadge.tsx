import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<string, string> = { 
    'INITIALIZED': 'bg-gray-100 text-gray-800 border-gray-200', 
    'IN_TRANSIT': 'bg-gray-50 text-gray-600 border-gray-200', 
    'DELIVERED': 'bg-black text-white border-black', 
    'SOLD': 'bg-white text-gray-400 border-gray-200', 
    'RECALLED': 'bg-red-50 text-red-700 border-red-200', 
    'REQUESTED': 'bg-gray-100 text-gray-700 border-gray-200', 
    'OFFER_MADE': 'bg-gray-50 text-gray-900 border-gray-300', 
    'APPROVED': 'bg-black text-white border-black', 
    'REJECTED': 'bg-gray-200 text-gray-500 border-gray-300' 
  };

  const labels: Record<string, string> = { 
    'INITIALIZED': 'Pripravené', 
    'IN_TRANSIT': 'Expedované', 
    'DELIVERED': 'Skladom', 
    'SOLD': 'Predané', 
    'RECALLED': 'STIAHNUTÉ', 
    'REQUESTED': 'Dopyt', 
    'OFFER_MADE': 'Ponuka', 
    'APPROVED': 'Schválené', 
    'REJECTED': 'Zamietnuté' 
  };

  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${styles[status] || 'bg-gray-50'}`}>
      {labels[status] || status}
    </span>
  );
};
