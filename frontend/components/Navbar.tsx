'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../app/auth-provider';
import api from '../lib/api';
import { LogOut, LayoutDashboard, FileCheck, ShieldAlert, Bell, X, AlertOctagon } from 'lucide-react';
import { Notification } from '../types';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read');
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <div className="p-2 bg-black rounded-lg mr-2 group-hover:bg-gray-800 transition-colors">
                <ShieldAlert className="text-white" size={24} />
              </div>
              <span className="text-gray-900 font-black text-xl tracking-tight">Pharma<span className="text-gray-500">Chain</span></span>
            </Link>
            
            <div className="hidden sm:ml-10 sm:flex sm:space-x-1">
              {user && (
                <Link href="/dashboard" className="text-gray-600 hover:text-black hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all">
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </Link>
              )}
              {user?.role === 'regulator' && (
                <Link href="/audit" className="text-gray-600 hover:text-black hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all">
                  <ShieldAlert className="w-4 h-4 mr-2" /> Dohľad ŠÚKL
                </Link>
              )}
              <Link href="/verify" className="text-gray-600 hover:text-black hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all">
                <FileCheck className="w-4 h-4 mr-2" /> Overiť Liek
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2.5 text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl transition-all relative"
                >
                  <Bell size={22} />
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 block h-3 w-3 rounded-full bg-black ring-2 ring-white animate-pulse"></span>
                  )}
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Upozornenia</h3>
                      <button onClick={() => setShowDropdown(false)}><X size={18} className="text-gray-400" /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Žiadne nové správy</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors relative group">
                            <div className="flex items-start">
                              <div className={`p-2 rounded-lg mr-3 ${n.type === 'URGENT_RECALL' ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
                                <AlertOctagon size={18} />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-black text-black mb-1 uppercase tracking-tighter">Urgentný Recall</p>
                                <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                                <p className="text-[10px] text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => markAsRead(n.id)}
                              className="absolute top-4 right-4 text-xs font-bold text-black opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Zmazať
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

            {user ? (
              <div className="flex items-center">
                <div className="text-right mr-3 hidden sm:block">
                  <p className="text-sm font-black text-gray-900 leading-none">{user.email.split('@')[0]}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{user.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                  title="Odhlásiť sa"
                >
                  <LogOut size={22} />
                </button>
              </div>
            ) : (
              <Link href="/login" className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 shadow-lg shadow-gray-100 transition-all">
                Vstup do systému
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
