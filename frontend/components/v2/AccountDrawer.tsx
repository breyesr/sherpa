'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import Drawer from './Drawer';
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Layers, 
  Tag, 
  Loader2, 
  AlertCircle,
  Users,
  CheckCircle
} from 'lucide-react';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  storeId?: string | null; // If provided, we are in Edit Mode
  initialData?: any; // Data passed from list view for instant population
}

export default function AccountDrawer({ isOpen, onClose, token, storeId, initialData }: AccountDrawerProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isEditing = !!storeId;

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    market: '',
    segment: '',
    region: '',
    external_id: '',
    client_ids: [] as string[]
  });

  // Initialize state when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (!storeId) {
        // Create mode: clear form
        setFormData({
          name: '',
          address: '',
          phone: '',
          email: '',
          market: '',
          segment: '',
          region: '',
          external_id: '',
          client_ids: []
        });
      } else if (initialData) {
        // Edit mode with initial data: populate instantly
        setFormData(prev => ({
          ...prev,
          name: initialData.name || '',
          address: initialData.address || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          market: initialData.market || '',
          segment: initialData.segment || '',
          region: initialData.region || '',
          external_id: initialData.external_id || '',
          client_ids: initialData.clients?.map((c: any) => c.id) || prev.client_ids
        }));
      }
    }
  }, [isOpen, storeId, initialData]);

  // Fetch full store data if editing (background sync for deep data)
  useEffect(() => {
    if (isOpen && storeId) {
      const fetchStore = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/trade/stores/${storeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setFormData(prev => ({
              ...prev,
              name: data.name || prev.name,
              address: data.address || prev.address,
              phone: data.phone || prev.phone,
              email: data.email || prev.email,
              market: data.market || prev.market,
              segment: data.segment || prev.segment,
              region: data.region || prev.region,
              external_id: data.external_id || prev.external_id,
              client_ids: data.clients?.map((c: any) => c.id) || prev.client_ids
            }));
          }
        } catch (err) {
          console.error('Failed to fetch store for background sync', err);
        }
      };
      fetchStore();
    }
  }, [isOpen, storeId, token]);

  // Fetch all clients for linking
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients-minimal'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: isOpen,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = isEditing 
      ? `${API_BASE_URL}/trade/stores/${storeId}` 
      : `${API_BASE_URL}/trade/stores`;
    
    const method = isEditing ? 'PATCH' : 'POST';

    // Clean payload
    const payload = {
      ...formData,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email || null,
      market: formData.market || null,
      segment: formData.segment || null,
      region: formData.region || null,
      external_id: formData.external_id || null
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save account');
      }

      queryClient.invalidateQueries({ queryKey: ['stores'] });
      if (storeId) queryClient.invalidateQueries({ queryKey: ['store', storeId] });
      
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      client_ids: prev.client_ids.includes(clientId)
        ? prev.client_ids.filter(id => id !== clientId)
        : [...prev.client_ids, clientId]
    }));
  };

  const footer = (
    <div className="flex gap-4">
      <button 
        onClick={onClose}
        className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
      >
        Cancel
      </button>
      <button 
        onClick={handleSubmit}
        disabled={loading || !formData.name}
        className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'Save Changes' : 'Create Account')}
      </button>
    </div>
  );

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? "Edit Account" : "New Account"} 
      subtitle={isEditing ? `Editing: ${formData.name || 'Account'}` : "Register a new physical point of sale."}
      footer={footer}
      size="wide"
    >
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Identity Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Store size={16} className="text-blue-600" />
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest text-blue-600">Identity & Location</h4>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Name</label>
            <input 
              required
              type="text"
              placeholder="e.g. Tienda La Norteña"
              className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Physical Address</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Street, City, State"
                className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900 pr-12"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
              <MapPin size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
          </div>
        </div>

        {/* Segmentation Section */}
        <div className="p-6 bg-gray-50 rounded-[2rem] space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Layers size={16} className="text-gray-400" />
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Surgical Segmentation</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Region</label>
              <input 
                type="text"
                placeholder="e.g. North, Sur, Central"
                className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.region}
                onChange={e => setFormData({...formData, region: e.target.value})}
                list="region-options"
              />
              <datalist id="region-options">
                <option value="North" />
                <option value="South" />
                <option value="East" />
                <option value="West" />
                <option value="Central" />
                <option value="National" />
                <option value="Norte" />
                <option value="Sur" />
                <option value="Este" />
                <option value="Oeste" />
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Segment</label>
              <select 
                className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={formData.segment}
                onChange={e => setFormData({...formData, segment: e.target.value})}
              >
                <option value="">Select Segment...</option>
                <option value="Premium">Premium</option>
                <option value="Standard">Standard</option>
                <option value="Economic">Economic</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Market Category</label>
            <input 
              type="text"
              placeholder="e.g. Retail, Wholesale, Convenience"
              className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
              value={formData.market}
              onChange={e => setFormData({...formData, market: e.target.value})}
            />
          </div>
        </div>

        {/* Contacts Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Users size={16} className="text-gray-900" />
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Linked Decision Makers</h4>
          </div>

          <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {allClients.map((client: any) => (
              <button
                key={client.id}
                onClick={() => toggleClient(client.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  formData.client_ids.includes(client.id)
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    formData.client_ids.includes(client.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Users size={14} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${formData.client_ids.includes(client.id) ? 'text-blue-900' : 'text-gray-700'}`}>
                      {client.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{client.role || 'Partner'}</p>
                  </div>
                </div>
                {formData.client_ids.includes(client.id) && <CheckCircle size={16} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* Integration Section */}
        <div className="pt-4 border-t border-gray-100">
           <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 italic">Internal External ID (Legacy Mapping)</label>
            <input 
              type="text"
              placeholder="e.g. ERP-10293"
              className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-300 outline-none text-xs font-mono text-gray-500"
              value={formData.external_id}
              onChange={e => setFormData({...formData, external_id: e.target.value})}
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
}
