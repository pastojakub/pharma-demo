import React from 'react';
import {
  ShoppingCart,
  RotateCcw,
  Package,
  Calendar,
  Building,
  MapPin,
  Info,
  Tag,
  CheckCircle,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { ModalHeader } from '../../ui/ModalHeader';
import { IntegrityBadge } from '../../ui/IntegrityBadge';
import { Batch, DrugDefinition, IntegrityStatus, Offer, OrderRequest } from '../../../types';
import { ORDER_STATUS } from '../../../lib/constants';

interface OrderDetailsModalProps {
  selectedBatch: Batch;
  integrity: IntegrityStatus | null;
  offers: Offer[];
  user: { role: string; org: string; email: string } | null;
  selectedDrug: DrugDefinition | null;
  setModalType: (type: string) => void;
  setModalTab: (tab: 'details' | 'batches' | 'pricing') => void;
  handleAction: (
    type: string,
    batch?: Batch,
    drug?: DrugDefinition,
    tab?: 'details' | 'batches' | 'pricing',
  ) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  selectedBatch,
  integrity,
  offers,
  user,
  selectedDrug,
  setModalType,
  setModalTab,
  handleAction,
}) => {
  const order = selectedBatch as unknown as OrderRequest;
  const orderIntegrity = integrity || selectedBatch.integrity;

  return (
    <div className="space-y-8">
      <ModalHeader
        decorIcon={<ShoppingCart size={100} />}
        label="Identifikátor objednávky"
        title={order.requestId}
        titleMono
        status={order.status}
        statusLabel={order.drugName}
        rightContent={orderIntegrity ? <IntegrityBadge integrity={orderIntegrity} /> : undefined}
      />

      {!orderIntegrity?.isValid && orderIntegrity?.mismatches && (
        <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex justify-between items-center">
          <div>
            <label className="block text-[10px] font-black text-red-400 uppercase mb-2 tracking-widest">
              Zistený nesúlad s blockchainom!
            </label>
            <ul className="space-y-1">
              {orderIntegrity.mismatches.map((m: string, i: number) => (
                <li key={i} className="text-xs font-bold text-red-700 flex items-center">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2" /> {m}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => handleAction('SYNC_ORDER', selectedBatch)}
            className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center"
          >
            <RotateCcw size={14} className="mr-2" /> Opraviť z blockchainu
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">
            Detaily požiadavky
          </label>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-gray-200 pb-2">
              <span className="text-sm font-bold text-gray-500 flex items-center">
                <Package size={14} className="mr-2" /> Množstvo
              </span>
              <span className="text-xl font-black text-black">
                {order.quantity} {order.unit}
              </span>
            </div>
            <div className="flex justify-between items-end border-b border-gray-200 pb-2">
              <span className="text-sm font-bold text-gray-500 flex items-center">
                <Calendar size={14} className="mr-2" /> Vytvorené
              </span>
              <span className="text-sm font-black text-black">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
            {order.status === ORDER_STATUS.APPROVED && (
              <div className="flex justify-between items-end border-b border-gray-200 pb-2 text-green-600">
                <span className="text-sm font-bold flex items-center">
                  <ShieldCheck size={14} className="mr-2" /> Schválené
                </span>
                <span className="text-sm font-black uppercase">PRIPRAVENÉ NA EXPEDÍCIU</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest font-bold">
            Účastníci transakcie
          </label>
          <div className="space-y-4 font-bold">
            <div className="flex flex-col border-b border-gray-200 pb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                <Building size={12} className="mr-1" /> Dodávateľ
              </span>
              <span className="text-sm font-black text-black">{order.manufacturerOrg}</span>
            </div>
            <div className="flex flex-col border-b border-gray-200 pb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                <MapPin size={12} className="mr-1" /> Odberateľ
              </span>
              <span className="text-sm font-black text-black">{order.pharmacyOrg}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">
          História cenových ponúk
        </label>
        <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Dátum</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">
                  Cena
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">
                  Stav
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {offers.length > 0 ? (
                offers.map((off, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 text-xs text-gray-500">
                      {new Date(off.createdAt).toLocaleString()}
                    </td>
                    <td className="px-8 py-4 text-right font-black text-black text-lg">
                      {off.price.toFixed(2)}€
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${off.status === ORDER_STATUS.APPROVED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {off.status === ORDER_STATUS.APPROVED ? 'Akceptovaná' : 'Odoslaná'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-8 py-10 text-center text-gray-400 font-bold italic">
                    Zatiaľ neboli zaslané žiadne ponuky.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => {
            if (selectedDrug) {
              setModalType('INFO');
              setModalTab('details');
            }
          }}
          className="flex-1 p-6 bg-white border-2 border-gray-100 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:border-black transition-all flex items-center justify-center group"
        >
          <Info size={18} className="mr-2 text-gray-400 group-hover:text-black transition-colors" />{' '}
          Karta lieku
        </button>

        {order.status === ORDER_STATUS.PENDING && user?.role === 'manufacturer' && (
          <button
            onClick={() => handleAction('OFFER', selectedBatch)}
            className="flex-1 p-6 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center shadow-lg"
          >
            <Tag size={18} className="mr-2" /> Poslať ponuku
          </button>
        )}

        {order.status === ORDER_STATUS.OFFER_MADE && user?.role === 'pharmacy' && (
          <button
            onClick={() => handleAction('APPROVE_OFFER', selectedBatch)}
            className="flex-1 p-6 bg-black text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center shadow-lg"
          >
            <CheckCircle size={18} className="mr-2" /> Schváliť ponuku
          </button>
        )}

        {order.status === ORDER_STATUS.APPROVED && user?.role === 'manufacturer' && (
          <button
            onClick={() => handleAction('FULFILL', selectedBatch)}
            className="flex-1 p-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg"
          >
            <Truck size={18} className="mr-2" /> Expedovať
          </button>
        )}
      </div>
    </div>
  );
};
