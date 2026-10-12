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
import { useDrawerStore } from '@/lib/store/DrawerManager';
import { BrandButton, BrandBadge, BrandCard } from '@/components/ui/brand';

export default function StoresPageV2() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const openDrawer = useDrawerStore((s) => s.openDrawer);

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
            <BrandBadge variant="accent" className="text-[10px] uppercase tracking-widest font-black">
              Verified Accounts
            </BrandBadge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-deep tracking-tight">
            {!showSalesIntelligence && showCampaigns ? 'Points of Sale' : 'Store Accounts'}
          </h1>
          <p className="text-slate mt-2 font-medium text-base md:text-lg max-w-2xl">
            {!showSalesIntelligence && showCampaigns 
              ? 'Manage physical retail locations for routing campaign leads.' 
              : 'Direct point-of-sale network and operational accounts ledger.'}
          </p>
        </div>
        <BrandButton 
          variant="primary"
          size="lg"
          onClick={() => openDrawer('account')}
          className="shadow-brand-subtle"
        >
          <Plus size={18} />
          {!showSalesIntelligence && showCampaigns ? 'Register Point of Sale' : 'Create Account'}
        </BrandButton>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-utility shadow-brand-subtle">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/50" size={18} />
          <input 
            type="text"
            placeholder={!showSalesIntelligence && showCampaigns ? "Search points of sale..." : "Search accounts..."}
            className="w-full pl-12 pr-4 py-2.5 bg-black/[0.02] border border-utility rounded-xl focus:border-deep focus:ring-2 focus:ring-deep/10 outline-none transition-all font-medium text-deep placeholder:text-slate/50 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-black/[0.02] p-1 rounded-xl border border-utility">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-brand-subtle text-deep font-bold' : 'text-slate/60 hover:text-deep'}`}
            title="List view"
          >
            <ListIcon size={18} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-brand-subtle text-deep font-bold' : 'text-slate/60 hover:text-deep'}`}
            title="Grid view"
          >
            <LayoutGrid size={18} />
          </button>
          <div className="w-px h-5 bg-utility mx-1" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-slate font-bold text-xs uppercase tracking-wider hover:text-deep transition-all">
            <Filter size={14} />
            Filter
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading || !token ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-white/60 animate-pulse rounded-2xl border border-utility" />
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-utility shadow-brand-subtle">
          <div className="w-16 h-16 bg-black/[0.03] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-utility">
            <Search className="text-slate/40" size={28} />
          </div>
          <h3 className="text-lg font-black text-deep">No accounts found</h3>
          <p className="text-slate text-sm mt-1">Try adjusting your search query or filters.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-utility shadow-brand-subtle overflow-hidden">
          <div className="divide-y divide-utility">
            {filteredStores.map((store) => (
              <div 
                key={store.id} 
                className="group relative flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-black/[0.015] transition-all cursor-pointer"
              >
                <Link 
                  href={`/trade/entities/stores/${store.id}`}
                  className="absolute inset-0 z-0"
                />
                <div className="relative z-10 flex items-center gap-5 pointer-events-none flex-1">
                  <div className="w-12 h-12 rounded-xl bg-deep/5 text-deep border border-utility flex items-center justify-center group-hover:bg-deep group-hover:text-white transition-all shadow-brand-subtle">
                    <StoreIcon size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-deep group-hover:text-deep/80 transition-colors">
                      {store.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-slate font-medium text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin size={13} className="text-slate/60" />
                        <span>{store.address || 'No address registered'}</span>
                      </div>
                      {store.region && (
                        <BrandBadge variant="neutral" className="text-[10px] py-0 px-2 font-mono">
                          {store.region}
                        </BrandBadge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 flex items-center gap-8 mt-4 md:mt-0">
                  {(showSalesIntelligence || showB2B) && (
                    <div className="hidden lg:flex flex-col items-end pointer-events-none">
                      <span className="text-[10px] font-black text-slate/60 uppercase tracking-widest mb-0.5">Last Activity</span>
                      <span className="font-mono text-xs font-bold text-deep">Today, 2:45 PM</span>
                    </div>
                  )}
                  <div className="flex flex-col items-end pointer-events-none">
                    <span className="text-[10px] font-black text-slate/60 uppercase tracking-widest mb-0.5">Segment</span>
                    <BrandBadge variant="accent" className="text-xs uppercase tracking-wider py-0.5 px-2.5">
                      {store.segment || 'General'}
                    </BrandBadge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDrawer('account', { storeId: store.id, initialData: store });
                      }}
                      className="p-2.5 text-slate/60 hover:text-deep hover:bg-black/5 rounded-xl transition-all relative z-20"
                      title="Edit account"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete store ${store.name}?`)) {
                          try {
                            await apiClient.delete<void>(`/trade/stores/${store.id}`);
                            queryClient.invalidateQueries({ queryKey: ['stores'] });
                          } catch (err) {
                            alert('Failed to delete store');
                          }
                        }
                      }}
                      className="p-2.5 text-slate/60 hover:text-alert hover:bg-alert/5 rounded-xl transition-all relative z-20"
                      title="Delete account"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className="text-slate/40 group-hover:text-deep group-hover:translate-x-1 transition-all pointer-events-none ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <BrandCard 
              key={store.id} 
              hoverable
              className="group relative flex flex-col justify-between cursor-pointer p-6"
            >
              <Link 
                href={`/trade/entities/stores/${store.id}`}
                className="absolute inset-0 z-0"
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-deep/5 text-deep border border-utility flex items-center justify-center group-hover:bg-deep group-hover:text-white transition-all shadow-brand-subtle">
                    <StoreIcon size={22} />
                  </div>
                  <div className="flex gap-1 relative z-20">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDrawer('account', { storeId: store.id, initialData: store });
                      }}
                      className="p-2 text-slate/40 hover:text-deep transition-colors rounded-lg hover:bg-black/5"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete store ${store.name}?`)) {
                          try {
                            await apiClient.delete<void>(`/trade/stores/${store.id}`);
                            queryClient.invalidateQueries({ queryKey: ['stores'] });
                          } catch (err) {
                            alert('Failed to delete store');
                          }
                        }
                      }}
                      className="p-2 text-slate/40 hover:text-alert transition-colors rounded-lg hover:bg-alert/5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-black text-deep mb-1 group-hover:text-deep/80 transition-colors">
                  {store.name}
                </h3>
                <p className="text-slate font-medium text-xs line-clamp-2 mb-4">
                  {store.address || 'No address registered for this account.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {store.region && (
                    <BrandBadge variant="neutral" className="text-[10px] font-mono py-0 px-2">
                      {store.region}
                    </BrandBadge>
                  )}
                  <BrandBadge variant="accent" className="text-[10px] uppercase font-bold py-0 px-2">
                    {store.segment || 'General'}
                  </BrandBadge>
                </div>
              </div>
              
              {(showSalesIntelligence || showB2B) && (
                <div className="mt-6 pt-4 border-t border-utility flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate/60 uppercase tracking-widest">Performance</span>
                    <span className="text-emerald-700 font-mono font-bold text-xs">Strong Growth</span>
                  </div>
                  <ChevronRight size={16} className="text-slate/40 group-hover:text-deep transition-all" />
                </div>
              )}
            </BrandCard>
          ))}
        </div>
      )}

    </div>
  );
}
