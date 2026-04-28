'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth-provider';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';
import { Search, History, AlertTriangle, ShieldAlert, Clock, Layers } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useToast } from '../../components/ToastProvider';

function AuditContent() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [batchID, setBatchID] = useState(searchParams.get('id') || '');
  const [history, setHistory] = useState<any[]>([]);
  const [subBatches, setSubBatches] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id && user?.role === 'regulator') {
      performSearch(id);
    }
  }, [searchParams, user]);

  const performSearch = async (id: string) => {
    setIsSearching(true);
    try {
      const [hRes, sRes] = await Promise.all([
        api.get(`/drugs/${id}/history`),
        api.get(`/drugs/${id}/sub-batches`)
      ]);
      setHistory(hRes.data);
      setSubBatches(sRes.data);
    } catch (err) {
      showToast('Šarža nebola nájdená alebo nastala chyba.', 'error');
      setHistory([]);
      setSubBatches([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold">Načítavam...</div>;
  if (!user || user.role !== 'regulator') return <div className="p-12 font-black text-center text-gray-400 uppercase tracking-widest">Prístup zamietnutý. Len pre ŠÚKL.</div>;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchID) return;
    performSearch(batchID);
  };

  const handleRecall = async () => {
    const targetID = batchID;
    setShowRecallModal(false);
    try {
      await api.post(`/drugs/recall`, { id: targetID });
      showToast(`Šarža ${targetID} bola úspešne stiahnutá z obehu.`, 'success');
      performSearch(targetID);
    } catch (err) {
      showToast('Chyba pri sťahovaní šarže z obehu.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-black rounded-lg text-white shadow-lg">
              <ShieldAlert size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black">Auditný Systém ŠÚKL</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 leading-none">
            Dohľad nad Reťazcom
          </h1>
          <p className="text-gray-500 mt-4 text-lg font-medium">Správa bezpečnostných incidentov a transparentný audit liečiv.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 p-10 mb-12">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-5">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
                <Search size={22} />
              </div>
              <input
                type="text"
                placeholder="Zadajte ID šarže (napr. BATCH-001)"
                value={batchID}
                onChange={(e) => setBatchID(e.target.value)}
                className="block w-full pl-14 pr-6 py-5 border-2 border-gray-100 rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50 text-xl font-mono font-bold transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-black text-white px-10 py-5 rounded-[2rem] font-black text-lg hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 active:scale-95 uppercase tracking-widest text-xs"
            >
              {isSearching ? 'Vyhľadávam...' : 'Preveriť históriu'}
            </button>
          </form>
        </div>

        {subBatches.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-8 flex items-center">
              <Layers className="mr-3 text-blue-500" /> Distribuované vetvy (Sub-šarže)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subBatches.map((sub, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setBatchID(sub.batchID);
                    performSearch(sub.batchID);
                  }}
                  className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 hover:border-black transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className="font-mono font-black text-lg group-hover:text-black">{sub.batchID}</p>
                    <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${sub.status === 'RECALLED' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {sub.status}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-400 uppercase tracking-widest">Vlastník</span>
                      <span className="text-gray-900">{sub.ownerOrg}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-400 uppercase tracking-widest">Množstvo</span>
                      <span className="text-gray-900">{sub.quantity} {sub.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-10">
            <div className="flex justify-between items-end border-b-2 border-gray-100 pb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
                  <History className="mr-3 text-gray-400" /> Auditný záznam
                </h2>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">ID ŠARŽE: {batchID}</p>
              </div>
              <button
                onClick={() => setShowRecallModal(true)}
                className="bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-200 hover:bg-black hover:text-white transition-all shadow-sm flex items-center"
              >
                <AlertTriangle size={18} className="mr-2" /> Stiahnuť z obehu (RECALL)
              </button>
            </div>

            <div className="relative space-y-10 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-1.5 before:bg-gray-100">
              {history.map((entry, index) => (
                <div key={index} className="relative pl-20 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="absolute left-5 top-2 w-7 h-7 bg-white border-4 border-black rounded-full z-10 shadow-md"></div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Zmena stavu</p>
                        <p className="text-2xl font-black text-gray-900">{entry.data?.status}</p>
                        <div className="flex gap-3 mt-3">
                          <p className="text-xs text-gray-400 flex items-center font-bold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 w-fit">
                            <Clock size={14} className="mr-2" /> {new Date(entry.timestamp?.seconds * 1000).toLocaleString()}
                          </p>
                          <p className="text-xs text-blue-600 flex items-center font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 w-fit uppercase tracking-widest">
                             {entry.data?.ownerOrg}
                          </p>
                          <p className="text-xs text-green-600 flex items-center font-bold bg-green-50 px-3 py-1.5 rounded-xl border border-green-100 w-fit">
                             {entry.data?.quantity} {entry.data?.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl text-gray-500 font-black">
                          TX: {entry.txId?.substring(0, 16)}...
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Aktuálny Vlastník</p>
                        <p className="font-black text-gray-900 truncate">{entry.data?.ownerOrg || entry.data?.currentOwner}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Liek</p>
                        <p className="font-black text-gray-900">{entry.data?.drugName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showRecallModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 z-[200] animate-in fade-in duration-500">
            <div className="bg-white rounded-[3rem] max-w-md w-full p-12 shadow-3xl animate-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-red-50 rounded-2xl mb-6 text-red-600">
                  <AlertTriangle size={48} />
                </div>
                <h3 className="text-3xl font-black text-gray-900 leading-tight uppercase tracking-tighter">Urgentný Recall</h3>
                <div className="h-1.5 w-20 bg-red-600 rounded-full mx-auto mt-4"></div>
              </div>
              
              <p className="text-gray-500 font-medium text-center leading-relaxed mb-10">
                Varovanie: Táto akcia okamžite zmení stav šarže <span className="font-black text-black">{batchID}</span> na <span className="text-red-600 font-black">RECALLED</span> v celom systéme.
              </p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleRecall}
                  className="w-full py-5 bg-red-600 text-white font-black rounded-[2rem] hover:bg-red-700 transition-all shadow-xl shadow-red-200 uppercase tracking-widest text-xs"
                >
                  Potvrdiť Recall
                </button>
                <button 
                  onClick={() => setShowRecallModal(false)}
                  className="w-full py-5 border-2 border-gray-100 text-gray-500 font-black rounded-[2rem] hover:bg-gray-50 transition-all uppercase tracking-widest text-xs"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-bold">Načítavam auditný systém...</div>}>
      <AuditContent />
    </Suspense>
  );
}
