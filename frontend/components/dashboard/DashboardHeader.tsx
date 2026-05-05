import React from 'react';
import { Search, RotateCcw, Plus, ShoppingCart, ShieldCheck, Layers, Building } from 'lucide-react';
import { User } from '../../types';

interface DashboardHeaderProps {
  user: User;
  isRegulator: boolean;
  isRefreshing: boolean;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onRefresh: () => void;
  onSync: () => void;
  onNewDrug: () => void;
  onNewOrder: () => void;
  onAudit: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user, isRegulator, isRefreshing, searchTerm,
  onSearchChange, onRefresh, onSync, onNewDrug, onNewOrder, onAudit,
}) => (
  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
    <div>
      <div className="flex items-center space-x-2 mb-3">
        <div className="bg-black p-1.5 rounded-lg text-white">
          {isRegulator ? <ShieldCheck size={18} /> : <Layers size={18} />}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-black">
          {isRegulator ? 'Regulatory Audit Mode' : 'Blockchain Tracking System'}
        </span>
      </div>
      <h1 className="text-5xl font-black tracking-tighter text-gray-900 leading-none">
        {isRegulator ? 'Dozorný Orgán' : user.role === 'manufacturer' ? 'Sklad Výrobcu' : 'Sklad Lekárne'}
      </h1>
      <div className="flex items-center text-gray-500 font-bold bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm w-fit mt-4">
        <Building size={18} className="mr-2 text-black" />
        {user.org}
      </div>
    </div>

    <div className="flex flex-wrap gap-4 w-full lg:w-auto items-center">
      <div className="relative flex-grow sm:w-80 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
        <input
          type="text"
          placeholder="Hľadať..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-gray-100 rounded-[2rem] focus:border-black outline-none font-bold shadow-xl shadow-gray-200/10 transition-all"
        />
      </div>

      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Obnoviť dáta"
        className={`p-4 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-black transition-all shadow-xl shadow-gray-200/10 group ${isRefreshing ? 'animate-pulse' : ''}`}
      >
        <RotateCcw size={20} className={`${isRefreshing ? 'text-black animate-spin' : 'text-gray-400 group-hover:text-black'} transition-colors`} />
      </button>

      <button
        onClick={onSync}
        title="Kompletná synchronizácia všetkých dát z blockchainu"
        className="flex items-center space-x-2 px-6 h-[60px] bg-white border-2 border-gray-100 rounded-[2rem] hover:border-black transition-all group shadow-xl shadow-gray-200/10"
      >
        <RotateCcw size={18} className="text-gray-400 group-hover:text-black transition-colors" />
        <span className="text-xs font-black uppercase tracking-widest text-black">Sync Systém</span>
      </button>

      {user.role === 'manufacturer' && !isRegulator && (
        <button onClick={onNewDrug} className="bg-black text-white h-[60px] px-8 py-4 rounded-[2rem] font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-300 flex items-center">
          <Plus size={20} className="mr-2" /> NOVÝ LIEK
        </button>
      )}
      {user.role === 'pharmacy' && !isRegulator && (
        <button onClick={onNewOrder} className="bg-gray-800 text-white h-[60px] px-8 py-4 rounded-[2rem] font-black hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center">
          <ShoppingCart size={20} className="mr-2" /> OBJEDNAŤ
        </button>
      )}
      {isRegulator && (
        <button onClick={onAudit} className="bg-black text-white h-[60px] px-8 py-4 rounded-[2rem] font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-300 flex items-center">
          <ShieldCheck size={20} className="mr-2" /> PREJSŤ NA AUDIT
        </button>
      )}
    </div>
  </div>
);
