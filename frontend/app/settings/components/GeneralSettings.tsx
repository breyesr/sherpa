'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, User as UserIcon, Lock, Save, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQueryClient } from '@tanstack/react-query';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Monterrey', label: 'Monterrey' },
  { value: 'America/Tijuana', label: 'Tijuana' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Denver', label: 'Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
];

interface GeneralSettingsProps {
  business: any;
  user: any;
  token: string | null;
  onMessage: (message: { type: string, text: string }) => void;
}

export default function GeneralSettings({ business, user, token, onMessage }: GeneralSettingsProps) {
  const queryClient = useQueryClient();
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const [editBusiness, setEditBusiness] = useState({ 
    name: business?.name || '', 
    category: business?.category || '', 
    contact_phone: business?.contact_phone || '', 
    timezone: business?.timezone || 'UTC' 
  });
  
  const [editUser, setEditUser] = useState({ 
    email: user?.email || '', 
    password: '' 
  });

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBusiness(true);
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
        onMessage({ type: 'success', text: 'Business profile updated successfully!' });
        queryClient.invalidateQueries({ queryKey: ['business'] });
      } else {
        throw new Error('Failed to update business profile');
      }
    } catch (err: any) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
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
        onMessage({ type: 'success', text: 'Account settings updated successfully!' });
        setEditUser(prev => ({ ...prev, password: '' }));
        queryClient.invalidateQueries({ queryKey: ['user'] });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to update account settings');
      }
    } catch (err: any) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
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
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Category</label>
              <input 
                type="text"
                value={editBusiness.category}
                onChange={e => setEditBusiness({...editBusiness, category: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                placeholder="e.g. Beauty, Health"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Phone</label>
              <input 
                type="text"
                value={editBusiness.contact_phone}
                onChange={e => setEditBusiness({...editBusiness, contact_phone: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Timezone</label>
              <select 
                value={editBusiness.timezone}
                onChange={e => setEditBusiness({...editBusiness, timezone: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              disabled={savingBusiness}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {savingBusiness ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Profile
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
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
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
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-10 font-medium"
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
              {savingUser ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Update Account
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
