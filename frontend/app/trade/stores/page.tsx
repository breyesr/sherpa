'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  Store as StoreIcon, 
  MapPin, 
  Plus,
  ChevronRight,
  Search,
  LayoutGrid,
  List as ListIcon,
  Filter,
  Edit2,
  Trash2
} from 'lucide-react';
import { Store, Business } from '@/types/models';
import AccountDrawer from '@/components/v2/AccountDrawer';

export default function StoresPageV2() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [accountDrawer, setAccountDrawer] = useState<{isOpen: boolean, storeId: string | null, initialData?: Store | null}>({
    isOpen: false,
    storeId: null,
    initialData: null
  });

  // Fetch Business
  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      try {
        return await apiClient.get<Business>('/business/me');
      } catch {
        return { vertical_type: 'BASIC' } as Business;
      }
    },
    enabled: !!token,
  });

  interface FeaturesConfig {
    campaign_flow?: { enabled?: boolean };
    sales_intelligence?: { enabled?: boolean };
    b2b_solutions?: { enabled?: boolean };
  }

  const features = (business?.features_config || {}) as FeaturesConfig;
  const showCampaigns = features.campaign_flow?.enabled ?? false;
  const showSalesIntelligence = features.sales_intelligence?.enabled ?? false;
  const showB2B = features.b2b_solutions?.enabled ?? false;

  // Fetch Stores
  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      return await apiClient.get<Store[]>('/trade/stores');
    },
    enabled: !!token,
  });

  const filteredStores = stores.filter((s) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              Beta V2
            </span>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            {!showSalesIntelligence && showCampaigns ? 'Points of Sale' : 'Accounts'}
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg max-w-2xl">
            {!showSalesIntelligence && showCampaigns ? 'Manage physical retail locations for routing campaign leads.' : 'Modernized view for managing your physical locations and sales intelligence.'}
          </p>
        </div>
        <button 
          onClick={() => setAccountDrawer({ isOpen: true, storeId: null })}
          className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-xl hover:bg-black transition-all active:scale-95"
        >
          <Plus size={18} />
          {!showSalesIntelligence && showCampaigns ? 'Register Point of Sale' : 'Create Account'}
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder={!showSalesIntelligence && showCampaigns ? "Search points of sale..." : "Search accounts..."}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ListIcon size={20} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid size={20} />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button className="flex items-center gap-2 px-3 py-2 text-gray-500 font-bold text-xs uppercase tracking-wider hover:text-gray-900 transition-all">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading || !token ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Search className="text-gray-300" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No accounts found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filteredStores.map((store) => (
              <div key={store.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-8 hover:bg-gray-50/50 transition-all cursor-pointer">
                <Link 
                  href={`/trade/stores/${store.id}`}
                  className="absolute inset-0 z-0"
                />
                <div className="relative z-10 flex items-center gap-6 pointer-events-none flex-1">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <StoreIcon size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                      {store.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-sm">{store.address || 'No address'}</span>
                      </div>
                      {store.region && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                          {store.region}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 flex items-center gap-12 mt-6 md:mt-0">
                  {(showSalesIntelligence || showB2B) && (
                    <div className="hidden lg:flex flex-col items-end pointer-events-none">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Activity</span>
                      <span className="font-bold text-gray-700">Today, 2:45 PM</span>
                    </div>
                  )}
                  <div className="flex flex-col items-end pointer-events-none">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Segment</span>
                    <span className="bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg text-xs font-bold text-gray-600">
                      {store.segment || 'General'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAccountDrawer({ isOpen: true, storeId: store.id, initialData: store });
                      }}
                      className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative z-20"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete store ${store.name}?`)) {
                          try {
                            await apiClient.delete<any>(`/trade/stores/${store.id}`);
                            queryClient.invalidateQueries({ queryKey: ['stores'] });
                          } catch (err) {
                            alert('Failed to delete store');
                          }
                        }
                      }}
                      className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all relative z-20"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all pointer-events-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <div 
              key={store.id} 
              className="group relative bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col justify-between cursor-pointer"
            >
              <Link 
                href={`/trade/stores/${store.id}`}
                className="absolute inset-0 z-0"
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <StoreIcon size={24} />
                  </div>
                  <div className="flex gap-2 relative z-20">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAccountDrawer({ isOpen: true, storeId: store.id, initialData: store });
                      }}
                      className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete store ${store.name}?`)) {
                          try {
                            await apiClient.delete<any>(`/trade/stores/${store.id}`);
                            queryClient.invalidateQueries({ queryKey: ['stores'] });
                          } catch (err) {
                            alert('Failed to delete store');
                          }
                        }
                      }}
                      className="p-2 text-gray-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {store.name}
                </h3>
...
                <p className="text-gray-500 font-medium text-sm line-clamp-2 mb-4">
                  {store.address || 'No address registered for this account.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {store.region && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">
                      {store.region}
                    </span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                    {store.segment || 'General'}
                  </span>
                </div>
              </div>
              
              {(showSalesIntelligence || showB2B) && (
                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance</span>
                    <span className="text-green-600 font-bold text-sm">Strong Growth</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-all" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AccountDrawer 
        isOpen={accountDrawer.isOpen}
        onClose={() => setAccountDrawer({ ...accountDrawer, isOpen: false })}
        token={token}
        storeId={accountDrawer.storeId}
        initialData={accountDrawer.initialData}
        isProspect={false}
      />
    </div>
  );
}
