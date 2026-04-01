'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User as UserIcon, Lock, Save, Loader2, Plus, Trash2, Database, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function GeneralSettings({ business, user, token, onMessage, onDirtyChange }: GeneralSettingsProps) {
  const queryClient = useQueryClient();
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const initialBusinessData = { 
    name: business?.name || '', 
    category: business?.category || '', 
    contact_phone: business?.contact_phone || '', 
    timezone: business?.timezone || 'UTC',
    crm_config: business?.crm_config || []
  };

  const initialUserData = { 
    email: user?.email || '', 
    password: '' 
  };

  const [editBusiness, setEditBusiness] = useState(initialBusinessData);
  const [editUser, setEditUser] = useState(initialUserData);

  // Dirty checking
  useEffect(() => {
    const isBizDirty = JSON.stringify(editBusiness) !== JSON.stringify(initialBusinessData);
    const isUserDirty = JSON.stringify(editUser) !== JSON.stringify(initialUserData);
    onDirtyChange?.(isBizDirty || isUserDirty);
  }, [editBusiness, editUser, business, user, onDirtyChange]);

  const handleAddField = () => {
    setEditBusiness({
      ...editBusiness,
      crm_config: [...editBusiness.crm_config, { key: '', label: '', type: 'text' }]
    });
  };

  const handleRemoveField = (index: number) => {
    const newConfig = [...editBusiness.crm_config];
    newConfig.splice(index, 1);
    setEditBusiness({ ...editBusiness, crm_config: newConfig });
  };

  const handleFieldChange = (index: number, field: string, value: string) => {
    const newConfig = [...editBusiness.crm_config];
    newConfig[index] = { ...newConfig[index], [field]: value };
    // Auto-generate key from label if key is empty
    if (field === 'label' && !newConfig[index].key) {
      newConfig[index].key = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
    setEditBusiness({ ...editBusiness, crm_config: newConfig });
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBusiness(true);
    
    // Filter out soft-deleted fields before saving
    const finalCrmConfig = editBusiness.crm_config.filter((f: any) => !f.is_deleted);
    const payload = { ...editBusiness, crm_config: finalCrmConfig };

    try {
      const res = await fetch(`${API_BASE_URL}/business/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onMessage({ type: 'success', text: 'Business profile updated successfully!' });
        // Update local state to remove the deleted items from view
        setEditBusiness(prev => ({ ...prev, crm_config: finalCrmConfig }));
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

      {/* CRM Configuration Section */}
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500 delay-150">
        <div className="flex items-center justify-between border-b border-gray-50 pb-6">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Database size={22} />
            </div>
            <h2>CRM Custom Fields</h2>
          </div>
          <button 
            onClick={handleAddField}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 text-sm"
          >
            <Plus size={18} />
            Add Field
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-medium">
            Define global fields for your clients. These fields will appear in the CRM profiles and the AI will be able to collect this information automatically.
          </p>

          {editBusiness.crm_config.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-gray-400 font-medium">No custom fields defined yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {editBusiness.crm_config.map((field: any, idx: number) => {
                const isSoftDeleted = field.is_deleted;
                
                return (
                  <div key={idx} className={`flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-4 rounded-2xl border transition-all duration-200 ${isSoftDeleted ? 'border-red-100 bg-red-50/30 opacity-60' : 'border-gray-100'}`}>
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Field Label</label>
                        {isSoftDeleted && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter">To be deleted</span>
                        )}
                      </div>
                      <input 
                        type="text"
                        value={field.label}
                        disabled={isSoftDeleted}
                        onChange={e => handleFieldChange(idx, 'label', e.target.value)}
                        placeholder="e.g. Pet Name"
                        className={`w-full p-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all ${isSoftDeleted ? 'line-through text-gray-400' : ''}`}
                      />
                    </div>
                    
                    <div className="w-full md:w-48 space-y-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                      <select 
                        value={field.type}
                        disabled={isSoftDeleted}
                        onChange={e => handleFieldChange(idx, 'type', e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium appearance-none transition-all"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Checkbox</option>
                      </select>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        const newConfig = [...editBusiness.crm_config];
                        if (isSoftDeleted) {
                          // Restore
                          delete newConfig[idx].is_deleted;
                        } else {
                          // Soft delete
                          newConfig[idx] = { ...newConfig[idx], is_deleted: true };
                        }
                        setEditBusiness({ ...editBusiness, crm_config: newConfig });
                      }}
                      className={`p-2.5 transition-colors border rounded-lg ${isSoftDeleted ? 'bg-white text-gray-400 hover:text-indigo-600 border-gray-200' : 'bg-white text-gray-400 hover:text-red-500 border-gray-200'}`}
                      title={isSoftDeleted ? "Restore field" : "Delete field"}
                    >
                      {isSoftDeleted ? <RefreshCw size={18} /> : <Trash2 size={18} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {editBusiness.crm_config.some((f: any) => f.is_deleted) && (
            <div className="flex items-center gap-2 p-4 bg-red-50 rounded-2xl border border-red-100">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-800 font-medium">
                Fields marked for deletion will be permanently removed after you click "Save". Historical data for these fields in existing clients will be preserved.
              </p>
            </div>
          )}

          {editBusiness.crm_config.length > 0 && (
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSaveBusiness}
                disabled={savingBusiness}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {savingBusiness ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save CRM Configuration
              </button>
            </div>
          )}
        </div>
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
