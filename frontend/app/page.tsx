'use client';

import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { ShieldCheck, Search, Activity, Lock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '../components/ToastProvider';

export default function Home() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    if (searchParams.get('error') === 'session_expired') {
      showToast('Vaša relácia vypršala. Prihláste sa znova.', 'error');
    }
  }, [searchParams, showToast]);

  return (
    <>
      <Navbar />
      <main className="flex-grow bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white py-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          </div>
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-8 border border-white/20">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Blockchain Network Live</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-none">
              PharmaChain <span className="text-gray-500">Tracker</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
              Transparentné sledovanie liečiv od výrobcu až k pacientovi pomocou Enterprise Blockchain technológie.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link 
                href="/verify" 
                className="bg-white text-black px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-2xl active:scale-95"
              >
                Overiť liek pre pacienta
              </Link>
              <Link 
                href="/login" 
                className="bg-black text-white border border-gray-700 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all shadow-2xl active:scale-95"
              >
                Vstup pre odborníkov
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="group text-center">
              <div className="w-24 h-24 bg-gray-50 text-black rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-gray-100 group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-xl shadow-gray-100">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight uppercase text-xs">Absolútna Integrita</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Každá zmena vlastníka a stavu je nezmazateľne zapísaná do distribuovaného registra.
              </p>
            </div>

            <div className="group text-center">
              <div className="w-24 h-24 bg-gray-50 text-black rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-gray-100 group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-xl shadow-gray-100">
                <Activity size={40} />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight uppercase text-xs">Real-Time Tracking</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Okamžitý prehľad o polohe a stave šarží liečiv naprieč celým dodávateľským reťazcom.
              </p>
            </div>

            <div className="group text-center">
              <div className="w-24 h-24 bg-gray-50 text-black rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-gray-100 group-hover:bg-black group-hover:text-white transition-all duration-500 shadow-xl shadow-gray-100">
                <Search size={40} />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight uppercase text-xs">Rýchly Recall</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Regulačný orgán vie okamžite stiahnuť celú šaržu z obehu jediným bezpečným zápisom.
              </p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gray-50 py-32 px-4 border-y border-gray-100">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4">Enterprise Solution</span>
              <h2 className="text-5xl font-black mb-8 tracking-tighter text-gray-900 leading-none">Prečo blockchain v zdravotníctve?</h2>
              <div className="space-y-6">
                {[
                  "Eliminácia falšovaných liekov na trhu.",
                  "Zvýšenie dôvery pacientov v liečebný proces.",
                  "Zefektívnenie práce regulačných orgánov."
                ].map((text, i) => (
                  <div key={i} className="flex items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-2 bg-black rounded-lg text-white mr-4">
                      <Lock size={16} />
                    </div>
                    <p className="text-gray-900 font-bold">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute -inset-4 bg-gray-200 rounded-[3rem] rotate-3 opacity-50"></div>
              <div className="relative bg-white p-4 rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden group">
                <img 
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800" 
                  alt="Health Tech" 
                  className="rounded-[2.5rem] grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center">
            <div className="p-2 bg-black rounded-lg mr-3 text-white">
              <ShieldCheck size={20} />
            </div>
            <span className="text-black font-black tracking-tighter text-xl">PharmaChain</span>
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">© 2026 PharmaChain Tracker • Powered by Hyperledger Fabric</p>
          <div className="flex space-x-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-black transition-colors">GDPR</a>
            <a href="#" className="hover:text-black transition-colors">API</a>
            <a href="#" className="hover:text-black transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </>
  );
}
