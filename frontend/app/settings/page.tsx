'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Settings as SettingsIcon, Calendar, MessageSquare, CheckCircle2, XCircle, RefreshCw, Save, User as UserIcon, Lock, Trash2, Send } from 'lucide-react';
import WhatsAppModal from '@/components/WhatsAppModal';
import TelegramModal from '@/components/TelegramModal';
import { API_BASE_URL } from '@/config';

export default function SettingsPage() {
  const token = useAuthStore((state) => state.token);
  const [business, setBusiness] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Edit states
  const [editBusiness, setEditBusiness] = useState({ name: '', category: '', contact_phone: '' });
  const [editUser, setEditUser] = useState({ email: '', password: '' });
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchData = useCallback(async () => {
    try {
      const [busRes, userRes] = await Promise.all([
        fetch(`${API_BASE_URL}/business/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (busRes.ok) {
        const busData = await busRes.json();
        setBusiness(busData);
        setEditBusiness({
          name: busData.name,
          category: busData.category || '',
          contact_phone: busData.contact_phone || ''
        });
      }
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
        setEditUser({ email: userData.email, password: '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();

    const handleMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data === 'google_connected') {
        fetchData();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [token, fetchData]);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBusiness(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/business/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editBusiness)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Business profile updated successfully!' });
        fetchData();
      } else {
        throw new Error('Failed to update business profile');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    setMessage({ type: '', text: '' });
    try {
      const body: any = { email: editUser.email };
      if (editUser.password) body.password = editUser.password;

      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Account settings updated successfully!' });
        setEditUser(prev => ({ ...prev, password: '' }));
        fetchData();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to update account settings');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingUser(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/google/authorize`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.open(data.authorization_url, 'Connect Google Calendar', 'width=600,height=700');
      }
    } catch (err) {
      console.error('Failed to initiate Google connection', err);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}? This will also clear your local cache.`)) return;
    
    setIsDisconnecting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/${provider}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `${provider} disconnected successfully.` });
        fetchData();
      } else {
        throw new Error(`Failed to disconnect ${provider}`);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE_URL}/integrations/google/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 w-48 bg-gray-200 rounded" /></div>;

  const isGoogleConnected = business?.integrations?.some((i: any) => i.provider === 'google');

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your business profile and account settings.</p>
        </div>
        {message.text && (
          <div className={`px-4 py-2 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="grid gap-8 max-w-4xl">
        {/* Business Section */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-50 pb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <SettingsIcon size={22} />
            </div>
            <h2>Business Profile</h2>
          </div>
          
          <form onSubmit={handleSaveBusiness} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Business Name</label>
                <input 
                  type="text"
                  value={editBusiness.name}
                  onChange={e => setEditBusiness({...editBusiness, name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Category</label>
                <input 
                  type="text"
                  value={editBusiness.category}
                  onChange={e => setEditBusiness({...editBusiness, category: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. Beauty, Health"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Phone</label>
                <input 
                  type="text"
                  value={editBusiness.contact_phone}
                  onChange={e => setEditBusiness({...editBusiness, contact_phone: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Trial Status</label>
                <div className="p-3 bg-green-50 text-green-700 rounded-xl border border-green-100 font-bold">
                  30 Days Remaining
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={savingBusiness}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save size={18} />
                {savingBusiness ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </section>

        {/* Account Section */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-50 pb-6">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <UserIcon size={22} />
            </div>
            <h2>Account Settings</h2>
          </div>
          
          <form onSubmit={handleSaveUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email"
                  value={editUser.email}
                  onChange={e => setEditUser({...editUser, email: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={editUser.password}
                    onChange={e => setEditUser({...editUser, password: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-10"
                    placeholder="Leave blank to keep current"
                  />
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={savingUser}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save size={18} />
                {savingUser ? 'Saving...' : 'Update Account'}
              </button>
            </div>
          </form>
        </section>

        {/* Integrations Section */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-50 pb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <Calendar size={22} />
            </div>
            <h2>Integrations</h2>
          </div>
          
          <div className="space-y-6">
            {/* Google Calendar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">Google Calendar</p>
                  <p className="text-sm text-gray-500">Sync availability and appointments.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isGoogleConnected ? (
                  <>
                    <button 
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 size={16} />
                      Connected
                    </span>
                    <button 
                      onClick={() => handleDisconnect('google')}
                      disabled={isDisconnecting}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Disconnect Google Calendar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleGoogleConnect}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    Connect Account
                  </button>
                )}
              </div>
            </div>

            {/* Telegram Bot */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4 ${!isGoogleConnected ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-blue-500">
                  <Send size={28} />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">Telegram Bot</p>
                  <p className="text-sm text-gray-500">Test the AI assistant via Telegram Bot API.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {business?.integrations?.some((i: any) => i.provider === 'telegram') ? (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 size={16} />
                      Connected
                    </span>
                    <button 
                      onClick={() => handleDisconnect('telegram')}
                      disabled={isDisconnecting}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Disconnect Telegram"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsTelegramModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    Connect Bot
                  </button>
                )}
              </div>
            </div>

            {/* WhatsApp */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4 ${!isGoogleConnected ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-green-500">
                  <MessageSquare size={28} />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">WhatsApp Business</p>
                  <p className="text-sm text-gray-500">Automate client messaging via Meta Cloud API.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {business?.integrations?.some((i: any) => i.provider === 'whatsapp') ? (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 size={16} />
                      Connected
                    </span>
                    <button 
                      onClick={() => handleDisconnect('whatsapp')}
                      disabled={isDisconnecting}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Disconnect WhatsApp"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-md active:scale-95"
                  >
                    Connect WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <WhatsAppModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSuccess={fetchData}
        token={token}
      />

      <TelegramModal 
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onSuccess={fetchData}
        token={token}
      />
    </div>
  );
}
