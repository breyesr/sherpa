'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search, User, Plus } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQuery } from '@tanstack/react-query';

import { components } from '@/types/api';

type ClientResponse = components['schemas']['ClientResponse'];
type StoreResponse = components['schemas']['StoreResponse'];

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  store?: StoreResponse; // Optional store object for editing
}

export default function StoreModal({ isOpen, onClose, onSuccess, token, store }: StoreModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    external_id: '',
    client_ids: [] as string[]
  });
  const [selectedClients, setSelectedClients] = useState<ClientResponse[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!store;

  // Fetch Clients for the Picker
  const { data: clients = [], isLoading: loadingClients, refetch: refetchClients } = useQuery<ClientResponse[]>({
    queryKey: ['clients-picker'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    },
    enabled: isOpen && !!token,
  });

  const filteredClients = (clients as ClientResponse[]).filter((c) => 
    (c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(clientSearch))) &&
    !formData.client_ids.includes(c.id)
  ).slice(0, 5); // Limit to 5 for the dropdown

  useEffect(() => {
    if (store && isOpen) {
      setFormData({
        name: store.name || '',
        address: store.address || '',
        external_id: store.external_id || '',
        client_ids: (store.clients || []).map(c => c.id)
      });
      setSelectedClients(store.clients || []);
    } else if (!isEditing && isOpen) {
      setFormData({ name: '', address: '', external_id: '', client_ids: [] });
      setSelectedClients([]);
      setClientSearch('');
    }
  }, [store, isOpen, isEditing]);

  if (!isOpen) return null;

  const handleSelectClient = (client: ClientResponse) => {
    if (formData.client_ids.includes(client.id)) return;
    
    setFormData({
      ...formData,
      client_ids: [...formData.client_ids, client.id]
    });
    setSelectedClients([...selectedClients, client]);
    setClientSearch('');
    setShowPicker(false);
  };

  const handleRemoveClient = (clientId: string) => {
    setFormData({
      ...formData,
      client_ids: formData.client_ids.filter(id => id !== clientId)
    });
    setSelectedClients(selectedClients.filter(c => c.id !== clientId));
  };

  const handleQuickAddClient = async () => {
    if (!clientSearch) return;
    setAddingClient(true);
    try {
      const res = await fetch(`${API_BASE_URL}/crm/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: clientSearch })
      });
      if (!res.ok) throw new Error('Failed to create client');
      const newClient = await res.json();
      await refetchClients();
      handleSelectClient(newClient);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = (isEditing && store?.id) ? `${API_BASE_URL}/trade/stores/${store.id}` : `${API_BASE_URL}/trade/stores`;
      const method = (isEditing && store?.id) ? 'PATCH' : 'POST';
      
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

            {/* Multiple Retailers Picker */}
            <div className="space-y-2 md:col-span-2 relative">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Linked Retailers / Contacts</label>
              
              {/* Selected Chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedClients.map(client => (
                  <div key={client.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-100 group transition-all">
                    <User size={12} />
                    {client.name}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveClient(client.id)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {selectedClients.length === 0 && <p className="text-xs text-gray-400 italic ml-1">No retailers linked yet.</p>}
              </div>

              <div className="relative group">
                <input 
                  type="text"
                  placeholder="Search and add retailers..."
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium pl-10"
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    setShowPicker(true);
                  }}
                  onFocus={() => setShowPicker(true)}
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                
                {showPicker && clientSearch && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto">
                    {loadingClients ? (
                      <div className="p-4 text-center text-gray-400 text-sm font-bold animate-pulse">Searching...</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {filteredClients.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectClient(c)}
                            className="w-full p-4 flex items-center justify-between hover:bg-blue-50 transition-colors group text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                                <User size={16} />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                                <p className="text-xs text-gray-400">{c.phone || 'No phone'}</p>
                              </div>
                            </div>
                            <Plus size={16} className="text-gray-300 group-hover:text-blue-500" />
                          </button>
                        ))}
                        
                        {/* Quick Add Option */}
                        <button
                          type="button"
                          disabled={addingClient}
                          onClick={handleQuickAddClient}
                          className="w-full p-4 flex items-center gap-3 hover:bg-green-50 transition-colors group text-left bg-gray-50/50"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
                            {addingClient ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                          </div>
                          <div>
                            <p className="font-bold text-green-700 text-sm">Quick Add &quot;{clientSearch}&quot;</p>
                            <p className="text-xs text-green-600/70">Create and link immediately</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
