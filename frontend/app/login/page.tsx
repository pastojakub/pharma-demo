'use client';

import React, { useState } from 'react';
import { useAuth } from '../auth-provider';
import api, { setApiBaseUrl } from '../../lib/api';
import { ShieldCheck, Lock, Mail, Server } from 'lucide-react';

const ORG_PORTALS = [
  { name: 'Portál Výrobcu', url: 'http://localhost:3001' },
  { name: 'Lekáreň A', url: 'http://localhost:3002' },
  { name: 'Lekáreň B', url: 'http://localhost:3003' },
  { name: 'Regulátor (ŠÚKL)', url: 'http://localhost:3004' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedPortal, setSelectedPortal] = useState(ORG_PORTALS[0].url);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setApiBaseUrl(selectedPortal);
      const response = await api.post('/auth/login', { email, password });
      login(response.data.access_token, response.data.role, email, response.data.org);
    } catch (err: any) {
      setError('Neplatné prihlasovacie údaje alebo nedostupný server.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-black rounded-2xl text-white shadow-lg shadow-gray-200">
              <ShieldCheck size={40} />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-gray-900">PharmaChain</h1>
          <p className="mt-2 text-gray-500 font-medium">Decentralizovaný systém sledovania liečiv</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 font-bold">
              {error}
            </div>
          )}
          
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Infraštruktúra Organizácie</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Server size={18} />
                </div>
                <select
                  value={selectedPortal}
                  onChange={(e) => setSelectedPortal(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50 text-gray-900 font-bold transition-all appearance-none"
                >
                  {ORG_PORTALS.map((p) => (
                    <option key={p.url} value={p.url}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50 text-gray-900 font-bold transition-all"
                  placeholder="meno@firma.sk"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Heslo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 p-4 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50 text-gray-900 font-bold transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 px-4 bg-black hover:bg-gray-800 text-white font-black rounded-2xl shadow-xl shadow-gray-100 transition-all duration-200 transform active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            Vstúpiť do portálu
          </button>
        </form>
      </div>
    </div>
  );
}
