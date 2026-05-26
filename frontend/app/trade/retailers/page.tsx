'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  ClipboardList,
  UserPlus,
  ChevronRight,
  Phone,
  Search,
  Plus
} from 'lucide-react';
import ClientModal from '@/components/ClientModal';
import { 
  ClientResponse, 
  BusinessProfileResponse,
  StoreResponse 
} from '@/types/api';

export default function RetailersPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResponse | null>(null);

  // Fetch Business for ClientModal
  const { data: business } = useQuery<BusinessProfileResponse>({
    queryKey: ['business'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/business/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Clients
  const { data: clients = [], isLoading: loadingClients } = useQuery<ClientResponse[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Stores for relationship count
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  const filteredRetailers = clients.filter((c) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const handleEditRetailer = (retailer: ClientResponse) => {
    setSelectedClient(retailer);
    setIsAddClientOpen(true);
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Retailers
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full uppercase tracking-tighter">CRM</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">Manage your commercial relationships and lead scores.</p>
        </div>
        <button 
          onClick={() => setIsAddClientOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          Create Retailer
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center bg-gray-50/30 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search retailers..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-400 font-bold uppercase tracking-widest">
            {filteredRetailers.length} Retailers Found
          </div>
        </div>
        
        {loadingClients ? (
          <div className="p-24 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400 font-bold">Loading retailers...</p>
          </div>
        ) : filteredRetailers.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {filteredRetailers.map((retailer) => (
              <div key={retailer.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-indigo-200 group-hover:text-indigo-500 transition-all">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-gray-900 line-clamp-1">{retailer.name}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {retailer.phone || 'No phone'}</span>
                      <span className="flex items-center gap-1 text-indigo-600 font-bold">
                        {stores.filter((s) => s.client_id === retailer.id).length} Linked Stores
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditRetailer(retailer)}
                    className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"
                    title="Quick Edit"
                  >
                    <UserPlus size={18} />
                  </button>
                  <Link 
                    href={`/crm?id=${retailer.id}`}
                    className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"
                    title="Full Profile"
                  >
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-24 text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList size={40} />
            </div>
            <h4 className="text-xl font-bold text-gray-900">No Retailers Found</h4>
            <p className="text-gray-500 mt-1">Start by creating your first commercial contact.</p>
            <button 
              onClick={() => setIsAddClientOpen(true)}
              className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
            >
              Add New Retailer
            </button>
          </div>
        )}
      </div>

      <ClientModal 
        isOpen={isAddClientOpen}
        onClose={() => {
          setIsAddClientOpen(false);
          setSelectedClient(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }}
        token={token}
        client={selectedClient}
        business={business}
      />
    </div>
  );
}
