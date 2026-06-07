'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  Store as StoreIcon, 
  MapPin, 
  Plus,
  ChevronRight,
  Search,
  User as UserIcon
} from 'lucide-react';
import StoreModal from '@/components/StoreModal';
import { 
  StoreResponse 
} from '@/types/api';

export default function StoresPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);

  // Fetch Stores
  const { data: stores = [], isLoading: loadingStores } = useQuery<StoreResponse[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stores');
      return res.json();
    },
    enabled: !!token,
  });

  const filteredStores = stores.filter((s) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Stores
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-tighter">Field</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">Manage physical locations and record field observations.</p>
        </div>
        <button 
          onClick={() => setIsAddStoreOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          Add Store
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center bg-gray-50/30 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name or address..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-400 font-bold uppercase tracking-widest">
            {filteredStores.length} Stores Found
          </div>
        </div>
        
        {loadingStores ? (
          <div className="p-24 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400 font-bold">Loading stores...</p>
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {filteredStores.map((store) => (
              <div key={store.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-blue-200 group-hover:text-blue-500 transition-all">
                    <StoreIcon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg text-gray-900 line-clamp-1">{store.name}</p>
                      {store.region && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md border border-gray-200">
                          {store.region}
                        </span>
                      )}
                      {store.segment && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                          {store.segment}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-1"><MapPin size={14} className="text-gray-400" /> {store.address || 'No address'}</span>
                      {store.clients && store.clients.length > 0 ? (
                        <span className="flex items-center gap-1 text-indigo-600 font-bold">
                          <UserIcon size={14} /> {store.clients.map(c => c.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-gray-300 italic">No contact linked</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Health Indicator (Notes Count) */}
                  <div className="hidden md:flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Store Health</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {store.notes && store.notes.length > 5 ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ) : store.notes && store.notes.length > 0 ? (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                        )}
                        <span className="text-xs font-bold text-gray-600">{store.notes?.length || 0} entries</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {store.external_id && (
                      <span className="text-[10px] font-black font-mono bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">
                        {store.external_id}
                      </span>
                    )}
                    <Link 
                      href={`/trade/stores/${store.id}`}
                      className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                      title="View Dossier"
                    >
                      <ChevronRight size={20} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-24 text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <StoreIcon size={40} />
            </div>
            <h4 className="text-xl font-bold text-gray-900">No Stores Found</h4>
            <p className="text-gray-500 mt-1">Start by adding your first retail location.</p>
            <button 
              onClick={() => setIsAddStoreOpen(true)}
              className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
            >
              Add Your First Store
            </button>
          </div>
        )}
      </div>

      <StoreModal 
        isOpen={isAddStoreOpen}
        onClose={() => setIsAddStoreOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['stores'] });
        }}
        token={token}
      />
    </div>
  );
}
