import React from 'react';
import { AlertCircle } from 'lucide-react';

export const RejectModal: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 text-center">
        <AlertCircle size={60} className="mx-auto text-gray-900 mb-6" />
        <h4 className="text-2xl font-black text-gray-900 mb-2">
          Naozaj chcete zamietnuť túto požiadavku?
        </h4>
        <p className="text-gray-500 font-bold">
          Táto akcia je nevratná a bude zaznamenaná v súkromnom kanáli.
        </p>
      </div>
    </div>
  );
};
