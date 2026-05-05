import React from 'react';
import { Box, Truck, Layers, ShoppingCart } from 'lucide-react';

type Tab = 'inventory' | 'orders' | 'catalog' | 'incoming';

interface DashboardTabsProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  isRegulator: boolean;
  inTransitCount: number;
  pendingOrdersCount: number;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  activeTab, onChange, isRegulator, inTransitCount, pendingOrdersCount,
}) => {
  const tab = (id: Tab, label: string, icon: React.ReactNode, badge?: number) => (
    <button
      onClick={() => onChange(id)}
      className={`px-5 md:px-6 lg:px-12 py-3 lg:py-4 rounded-[2rem] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center whitespace-nowrap flex-shrink-0 transition-all ${activeTab === id ? 'bg-white text-black shadow-lg' : 'text-gray-500'}`}
    >
      {icon}
      {label}
      {!!badge && (
        <span className="ml-2 bg-black text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center animate-pulse font-bold flex-shrink-0">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex space-x-1 bg-gray-200/50 p-1.5 rounded-[2.5rem] w-full lg:w-max max-w-full mb-6 md:mb-12 border border-gray-200 shadow-inner overflow-x-auto custom-scrollbar">
      {!isRegulator && tab('inventory', 'Sklad', <Box size={18} className="mr-2 flex-shrink-0" />)}
      {!isRegulator && tab('incoming', 'Prichádzajúce', <Truck size={18} className="mr-2 flex-shrink-0" />, inTransitCount || undefined)}
      {tab('catalog', 'Katalóg', <Layers size={18} className="mr-2 flex-shrink-0" />)}
      {!isRegulator && tab('orders', 'Objednávky', <ShoppingCart size={18} className="mr-2 flex-shrink-0" />, pendingOrdersCount || undefined)}
    </div>
  );
};
