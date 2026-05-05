'use client';

import React, { useState } from 'react';
import Cookies from 'js-cookie';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';
import { Search, ShieldCheck, AlertCircle, Building, Calendar, ShieldAlert } from 'lucide-react';
import { Batch, TransactionHistory, IntegrityStatus } from '../../types';
import { BlockchainTimeline } from '../../components/ui/BlockchainTimeline';

export default function VerifyPage() {
  const [batchID, setBatchID] = useState('');
  const [result, setResult] = useState<Batch | null>(null);
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchID) return;
    
    setIsSearching(true);
    setError('');
    setResult(null);
    setHistory([]);
    setIntegrity(null);
    
    try {
      // 1. Basic Verify (Public)
      const vRes = await api.get(`/drugs/${batchID}/verify`);
      setResult(vRes.data);

      // Both endpoints handle auth gracefully: history returns [] for unauthenticated,
      // integrity returns masked data. Call both always; the interceptor adds the token if present.
      const hasToken = !!Cookies.get('auth_token');

      try {
        const iRes = await api.get(`/drugs/${batchID}/verify-integrity`);
        setIntegrity(iRes.data);
      } catch {
        setIntegrity(null);
      }

      if (hasToken) {
        try {
          const hRes = await api.get(`/drugs/${batchID}/history`);
          setHistory(Array.isArray(hRes.data) ? hRes.data : []);
        } catch {
          setHistory([]);
        }
      }

    } catch (err) {
      setError('Šarža nebola v systéme nájdená (možný falzifikát). Prosím, skontrolujte kód na obale lieku.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto py-16 px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="inline-flex p-3 bg-gray-100 rounded-2xl mb-6 text-gray-400">
            <Search size={32} />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 leading-none mb-4">Overenie Autenticity</h1>
          <p className="text-lg text-gray-500 font-medium">
            Overte si pôvod vášho lieku v bezpečnej blockchain sieti.
          </p>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 p-10 mb-12">
          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-5">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
                <Search size={22} />
              </div>
              <input
                type="text"
                placeholder="Napr. Batch-001"
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
              {isSearching ? 'Overujem...' : 'Overiť liek'}
            </button>
          </form>

          {error && (
            <div className="mt-8 flex items-center p-6 bg-red-50 text-red-800 rounded-3xl border border-red-100 animate-in fade-in zoom-in-95">
              <AlertCircle className="mr-4 flex-shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          )}
        </div>

        {result && (
          <div className={`rounded-[3rem] border-2 overflow-hidden shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-8 duration-700 ${
            result.status === 'RECALLED' ? 'border-red-200' : 'border-gray-900'
          }`}>
            <div className={`p-10 text-center ${
              result.status === 'RECALLED' ? 'bg-red-600' : 'bg-black'
            }`}>
              {result.status === 'RECALLED' ? (
                <div className="flex flex-col items-center text-white">
                  <AlertCircle size={64} className="mb-4 animate-pulse" />
                  <h2 className="text-3xl font-black uppercase tracking-[0.2em]">VAROVANIE: STIAHNUTÉ</h2>
                </div>
              ) : (
                <div className="flex flex-col items-center text-white">
                  <ShieldCheck size={64} className="mb-4" />
                  <h2 className="text-3xl font-black uppercase tracking-[0.2em]">AUTENTICKÝ LIEK</h2>
                </div>
              )}
            </div>
            
            <div className="bg-white p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Názov lieku</label>
                    <p className="text-4xl font-black text-gray-900 leading-none">{result.drugName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Kód šarže</label>
                    <p className="text-2xl font-mono text-black font-black bg-gray-50 px-4 py-2 rounded-xl inline-block">{result.batchID}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center text-gray-700 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <Building className="mr-4 text-gray-400" size={24} />
                    <div>
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Výrobca</span>
                      <span className="font-bold text-lg">{result.manufacturer}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <Calendar className="mr-4 text-gray-400" size={24} />
                    <div>
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Dátum exspirácie</span>
                      <span className="font-bold text-lg">{result.expiryDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <ShieldCheck className={`mr-4 ${result.status === 'RECALLED' ? 'text-red-500' : 'text-gray-900'}`} size={24} />
                    <div>
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                      <span className="font-bold text-lg">{result.status === 'RECALLED' ? 'Stiahnuté z obehu' : 'Overený pôvod'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {result.status === 'RECALLED' && (
                <div className="mt-12 p-8 bg-red-50 border-2 border-red-100 rounded-[2.5rem] text-red-800">
                  <p className="font-black text-xl flex items-center mb-3">
                    <AlertCircle className="mr-3" size={28} /> Dôležité upozornenie!
                  </p>
                  <p className="font-medium text-lg leading-relaxed">
                    Tento liek bol stiahnutý z obehu z bezpečnostných dôvodov. Prosím, neužívajte ho a vráťte ho do najbližšej lekárne.
                  </p>
                </div>
              )}

              {/* Integrity Section */}
              {integrity && (
                <div className={`mt-12 p-8 rounded-[2.5rem] border-2 flex items-center space-x-5 ${integrity.isValid ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                  {integrity.isValid ? <ShieldCheck size={48} /> : <ShieldAlert size={48} />}
                  <div>
                    <p className="font-black text-2xl leading-none uppercase tracking-tighter">{integrity.isValid ? 'DÁTA SÚ ZHODNÉ S BLOCKCHAINOM' : 'ZISTENÝ NESÚLAD DÁT'}</p>
                    <p className="text-sm font-bold opacity-70 mt-2">
                      {integrity.isValid 
                        ? 'Informácie v našom systéme sa zhodujú s nezmazateľným blockchain záznamom.' 
                        : 'Varovanie: Boli zistené nezrovnalosti medzi databázou a blockchainom.'}
                    </p>
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <div className="mt-16">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-10 text-center">Životný cyklus šarže (Blockchain)</h3>
                  <BlockchainTimeline history={history} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
