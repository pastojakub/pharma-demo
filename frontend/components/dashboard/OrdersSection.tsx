import React from 'react';
import { ShieldCheck, Zap, Info } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { OrderRequest, User, DrugDefinition } from '../../types';

interface OrdersSectionProps {
  orders: OrderRequest[];
  user: User;
  catalog: DrugDefinition[];
  handleAction: (type: string, batch?: any, drug?: DrugDefinition) => void;
  verifyOrderOnBC: (order: OrderRequest) => void;
}

export const OrdersSection: React.FC<OrdersSectionProps> = ({
  orders,
  user,
  catalog,
  handleAction,
  verifyOrderOnBC
}) => {
  return (
    <div className="bg-white rounded-[3rem] border border-gray-200 overflow-hidden shadow-xl animate-in fade-in duration-500">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400">ID Požiadavky</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Liek</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Partner</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Stav</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400 text-center">Blockchain</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-400">Akcie</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 font-bold">
          {Array.isArray(orders) && orders.map(order => (
            <tr 
              key={order.id} 
              className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
              onClick={() => handleAction('ORDER_DETAILS', order)}
            >
              <td className="px-10 py-6 font-mono font-black text-gray-900 group-hover:text-black transition-colors">{order.requestId}</td>
              <td className="px-8 py-6">
                <p className="text-gray-900">{order.drugName}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{order.quantity} {order.unit}</p>
              </td>
              <td className="px-8 py-6 text-gray-600">
                {user.role === 'manufacturer' ? order.pharmacyOrg : order.manufacturerOrg}
              </td>
              <td className="px-8 py-6"><StatusBadge status={order.status}/></td>
              <td className="px-8 py-6 text-center">
                {order.bcVerified ? (
                  order.integrity?.isValid ? (
                    <div className="text-black flex flex-col items-center">
                      <ShieldCheck size={20}/>
                      <span className="text-[8px] font-black mt-1 uppercase">Overené</span>
                    </div>
                  ) : (
                    <div className="text-red-600 flex flex-col items-center">
                      <ShieldCheck size={20} className="animate-pulse"/>
                      <span className="text-[8px] font-black mt-1 uppercase">Nesúlad</span>
                      {order.integrity?.mismatches?.map((m, i) => (
                        <span key={i} className="text-[7px] font-bold leading-tight">{m}</span>
                      ))}
                    </div>
                  )
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      verifyOrderOnBC(order);
                    }} 
                    className="p-2 bg-gray-100 rounded-xl text-gray-400 hover:bg-black hover:text-white transition-all"
                  >
                    <Zap size={18}/>
                  </button>
                )}
              </td>
              <td className="px-8 py-6">
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction('ORDER_DETAILS', order);
                    }} 
                    className="bg-white border border-gray-200 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 shadow-sm transition-all flex items-center"
                  >
                    <Info size={14} className="mr-2 text-gray-400"/> DETAIL
                  </button>
                  
                  {user.role === 'manufacturer' && (order.status === 'PENDING' || order.status === 'REQUESTED' || order.status === 'OFFER_MADE') && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('OFFER', order);
                        }} 
                        className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 shadow-md transition-all"
                      >CENA</button>
                    </>
                  )}
                  {user.role === 'manufacturer' && (order.status === 'APPROVED' || order.status === 'ORDERED') && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction('FULFILL', order);
                      }} 
                      className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 shadow-md transition-all"
                    >VYBAVIŤ</button>
                  )}
                  {user.role === 'pharmacy' && order.status === 'OFFER_MADE' && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction('APPROVE_OFFER', order);
                        }} 
                        className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-800 shadow-md transition-all"
                      >SCHVÁLIŤ</button>
                    </>
                  )}
                  {(order.status === 'ORDERED' || order.status === 'FULFILLED') && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction('VIEW_FULFILLMENT', order);
                      }} 
                      className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all"
                    >DORUČENIE</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
