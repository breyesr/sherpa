'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  store?: any; // Optional store object for editing
}

export default function StoreModal({ isOpen, onClose, onSuccess, token, store }: StoreModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_name: '',
    contact_phone: '',
    external_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!store;

  useEffect(() => {
    if (store && isOpen) {
      setFormData({
        name: store.name || '',
        address: store.address || '',
        contact_name: store.contact_name || '',
        contact_phone: store.contact_phone || '',
        external_id: store.external_id || ''
      });
    } else if (!isEditing && isOpen) {
      setFormData({ name: '', address: '', contact_name: '', contact_phone: '', external_id: '' });
    }
  }, [store, isOpen, isEditing]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing ? `${API_BASE_URL}/trade/stores/${store.id}` : `${API_BASE_URL}/trade/stores`;
      const method = isEditing ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `Failed to ${isEditing ? 'update' : 'create'} store` }));
        throw new Error(errorData.detail || `Failed to ${isEditing ? 'update' : 'create'} store`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Store' : 'Add New Store'}</h2>
            <p className="text-sm text-gray-500 font-medium">
              {isEditing ? 'Update your retail location details.' : 'Create a new retail location or retailer entry.'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-all p-2 hover:bg-gray-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Store Name *</label>
              <input 
                required
                type="text"
                placeholder="e.g. Walmart Downtown"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Physical Address</label>
              <input 
                type="text"
                placeholder="Full address or location name"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Contact Name</label>
              <input 
                type="text"
                placeholder="Store manager or owner"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                value={formData.contact_name}
                onChange={e => setFormData({...formData, contact_name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Contact Phone</label>
              <input 
                type="text"
                placeholder="+1..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                value={formData.contact_phone}
                onChange={e => setFormData({...formData, contact_phone: e.target.value})}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">External ID / SKU</label>
              <input 
                type="text"
                placeholder="Internal code for ERP/Inventory sync"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                value={formData.external_id}
                onChange={e => setFormData({...formData, external_id: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              disabled={loading || !formData.name}
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'Save Changes' : 'Create Store')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
