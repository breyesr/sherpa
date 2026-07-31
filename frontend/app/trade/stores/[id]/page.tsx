'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  Store as StoreIcon, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  ChevronLeft,
  FileText,
  ShoppingBag,
  Package,
  Activity,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Target,
  AlertCircle,
  ExternalLink,
  Trash2,
  Users,
  LucideIcon
} from 'lucide-react';
import { components } from '@/types/api';
import { 
  User as UserModel, 
  Business as BusinessModel, 
  Client as ClientModel 
} from '@/types/models';

type StoreResponse = components['schemas']['StoreResponse'];
type StoreNoteResponse = components['schemas']['StoreNoteResponse'];
type OrderResponse = components['schemas']['OrderResponse'];
type ProductResponse = components['schemas']['ProductResponse'];
type CompetitorResponse = components['schemas']['CompetitorResponse'];

interface FeaturesConfig {
  campaign_flow?: { enabled?: boolean };
  sales_intelligence?: { enabled?: boolean };
  b2b_solutions?: { enabled?: boolean };
  products?: { enabled?: boolean };
}
import FieldNoteDrawer from '@/components/v2/FieldNoteDrawer';
import OrderDrawer from '@/components/v2/OrderDrawer';

type TabType = 'details' | 'products' | 'orders' | 'notes' | 'referrals';
type NoteSubTab = 'all' | 'commercial' | 'marketing' | 'intel';

export default function StoreDetailPageV2() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [activeNoteSubTab, setActiveNoteSubTab] = useState<NoteSubTab>('all');
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

  // Fetch Store Detail
  const { data: store, isLoading, isFetched } = useQuery<StoreResponse>({
    queryKey: ['store', id],
    queryFn: async () => {
      return await apiClient.get<StoreResponse>(`/trade/stores/${id}`);
    },
    enabled: !!token && !!id,
  });

  // Fetch Store Orders
  const { data: orders = [] } = useQuery<OrderResponse[]>({
    queryKey: ['orders', id],
    queryFn: async () => {
      try {
        return await apiClient.get<OrderResponse[]>(`/trade/orders?store_id=${id}`);
      } catch {
        return [];
      }
    },
    enabled: !!token && !!id,
  });

  // Fetch Competitors
  const { data: competitors = [] } = useQuery<CompetitorResponse[]>({
    queryKey: ['competitors', id],
    queryFn: async () => {
      try {
        return await apiClient.get<CompetitorResponse[]>(`/trade/competitors?store_id=${id}`);
      } catch {
        return [];
      }
    },
    enabled: !!token && !!id,
  });

  // Fetch Products (Global catalog for now, could be filtered in future)
  const { data: products = [] } = useQuery<ProductResponse[]>({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        return await apiClient.get<ProductResponse[]>('/trade/products');
      } catch {
        return [];
      }
    },
    enabled: !!token,
  });

  // Fetch Referred Prospects (Referrals)
  const { data: referrals = [] } = useQuery<StoreResponse[]>({
    queryKey: ['referrals', id],
    queryFn: async () => {
      try {
        return await apiClient.get<StoreResponse[]>(`/trade/stores?is_prospect=true&assigned_store_id=${id}`);
      } catch {
        return [];
      }
    },
    enabled: !!token && !!id,
  });

  // Fetch Current User
  const { data: currentUser } = useQuery<UserModel>({
    queryKey: ['me'],
    queryFn: async () => {
      return await apiClient.get<UserModel>('/auth/me');
    },
    enabled: !!token,
  });

  // Fetch Business
  const { data: business } = useQuery<BusinessModel>({
    queryKey: ['business'],
    queryFn: async () => {
      try {
        return await apiClient.get<BusinessModel>('/business/me');
      } catch {
        return { vertical_type: 'BASIC' } as BusinessModel;
      }
    },
    enabled: !!token,
  });

  const features = (business?.features_config as FeaturesConfig | undefined) || {};
  const showCampaigns = features.campaign_flow?.enabled ?? false;
  const showSalesIntelligence = features.sales_intelligence?.enabled ?? false;
  const showB2B = features.b2b_solutions?.enabled ?? false;
  const showProducts = features.products?.enabled ?? (business?.vertical_type === 'TRADE');

  if (isLoading || !token) return <div className="p-20 text-center font-bold text-gray-400">Loading Account Intelligence...</div>;
  if (!store) return <div className="p-20 text-center font-bold text-red-500">Account not found or connection error.</div>;

  const totalOrderValue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const totalReferralPipelineValue = referrals.reduce((sum, ref) => sum + (ref.potential_value || 0), 0);

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    ...(showProducts ? [{ id: 'products', label: 'Products', icon: Package }] : []),
    ...((showB2B || showProducts) ? [{ id: 'orders', label: 'Orders', icon: ShoppingBag }] : []),
    ...(showSalesIntelligence ? [{ id: 'notes', label: 'Timeline', icon: Activity }] : []),
    ...(showCampaigns ? [{ id: 'referrals', label: 'Referrals', icon: Users }] : []),
  ];

  const noteSubTabs = [
    { id: 'all', label: 'All Observations' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'intel', label: 'Opps / Risks' },
  ];

  const filteredNotes = (store?.notes || []).filter((note: StoreNoteResponse) => {
    if (activeNoteSubTab === 'all') return true;
    
    if (activeNoteSubTab === 'intel') {
      return (
        ['risk', 'opportunity', 'threat', 'anniversary'].includes(note.note_type || '') ||
        !!note.risks ||
        !!note.opportunities
      );
    }
    
    return note.note_type === activeNoteSubTab;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-all" />
          {store?.is_prospect ? 'Back to Prospects' : (showSalesIntelligence ? 'Back to Accounts' : 'Back to Points of Sale')}
        </button>
        <button
          onClick={async () => {
            const isProspect = store?.is_prospect;
            const term = isProspect ? 'prospect account' : 'store';
            if (confirm(`Are you sure you want to delete ${term} ${store?.name}?`)) {
              try {
                await apiClient.delete<void>(`/trade/stores/${store?.id}`);
                router.push(isProspect ? '/trade/prospects/accounts' : '/trade/stores');
              } catch (err) {
                alert(`Failed to delete ${term}`);
              }
            }
          }}
          className="flex items-center gap-2 text-red-600 hover:text-red-800 font-bold transition-all bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl text-sm"
        >
          <Trash2 size={16} />
          Delete {store?.is_prospect ? 'Prospect Account' : 'Account'}
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative flex flex-col lg:flex-row justify-between gap-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-200 shrink-0">
              <StoreIcon size={48} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Active Account
                </span>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-gray-200">
                  {store.segment || 'General'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
                {store.name}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center gap-6 text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-blue-500" />
                  <span>{store.address || 'No address registered'}</span>
                </div>
                {store.region && (
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-orange-500" />
                    <span>Region: {store.region}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions / Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex gap-4 items-center flex-wrap">
            {(showB2B || showProducts) && (
              <>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 min-w-[140px]">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Total Sales</span>
                  <span className="text-2xl font-black text-gray-900">${totalOrderValue.toLocaleString()}</span>
                  <div className="flex items-center gap-1 text-green-600 text-[10px] font-bold mt-1">
                    <TrendingUp size={12} /> {orders.length} Orders
                  </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 min-w-[140px]">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Avg. Ticket</span>
                  <span className="text-2xl font-black text-gray-900">
                    ${orders.length > 0 ? (totalOrderValue / orders.length).toFixed(0) : '0'}
                  </span>
                  <div className="flex items-center gap-1 text-blue-600 text-[10px] font-bold mt-1">
                    <ShoppingBag size={12} /> Per Order
                  </div>
                </div>
              </>
            )}
            {showCampaigns && (
              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 min-w-[140px]">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Referrals Value</span>
                <span className="text-2xl font-black text-gray-900">${totalReferralPipelineValue.toLocaleString()}</span>
                <div className="flex items-center gap-1 text-purple-600 text-[10px] font-bold mt-1">
                  <Users size={12} /> {referrals.length} Referrals
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tabs and Content */}
        <div className={`space-y-6 ${showSalesIntelligence ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <div className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 min-h-[400px]">
            {activeTab === 'details' && (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <FileText size={20} className="text-blue-500" />
                    General Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InfoItem label="Full Name" value={store.name} icon={StoreIcon} />
                    <InfoItem label="Physical Address" value={store.address || 'Not specified'} icon={MapPin} />
                    <InfoItem label="Phone Number" value={store.phone || 'Not available'} icon={Phone} />
                    <InfoItem label="Email Address" value={store.email || 'Not available'} icon={Mail} />
                  </div>
                </section>

                <section className="pt-8 border-t border-gray-50">
                  <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Target size={20} className="text-orange-500" />
                    Market Context
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Market</span>
                      <span className="font-bold text-gray-900 text-lg">{store.market || 'Unassigned'}</span>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Segment</span>
                      <span className="font-bold text-gray-900 text-lg">{store.segment || 'General'}</span>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Region</span>
                      <span className="font-bold text-gray-900 text-lg">{store.region || 'Unknown'}</span>
                    </div>
                  </div>
                </section>

                {showSalesIntelligence && (
                  <section className="pt-8 border-t border-gray-50">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <TrendingUp size={20} className="text-red-500" />
                        Competitive Matrix
                      </h3>
                      <button className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">
                        + Add Rival
                      </button>
                    </div>

                    {competitors.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {competitors.map((rival) => (
                          <div key={rival.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:border-red-100 transition-all">
                            <div className="p-6 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-red-500">
                                  <Activity size={20} />
                                </div>
                                <div>
                                  <p className="font-black text-gray-900">{rival.name}</p>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Store Rival</p>
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                rival.presence_level?.toLowerCase() === 'high' ? 'bg-red-100 text-red-700' :
                                rival.presence_level?.toLowerCase() === 'medium' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {rival.presence_level || 'Low'} Presence
                              </div>
                            </div>
                            
                            <div className="p-6 grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1.5">
                                  <ArrowUpRight size={12} /> Strengths
                                </span>
                                <p className="text-xs font-medium text-gray-600 leading-relaxed italic">
                                  {rival.strengths || 'No specific strengths recorded.'}
                                </p>
                              </div>
                              <div className="space-y-3">
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5">
                                  <AlertCircle size={12} /> Weaknesses
                                </span>
                                <p className="text-xs font-medium text-gray-600 leading-relaxed italic">
                                  {rival.weaknesses || 'No identified weaknesses.'}
                                </p>
                              </div>
                            </div>

                            <div className="px-6 pb-6 mt-auto">
                              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400">Last updated: {new Date(rival.updated_at).toLocaleDateString()}</span>
                                <button className="text-xs font-black text-gray-900 group-hover:text-red-600 transition-colors">Details</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 py-12 text-center">
                        <TrendingUp className="mx-auto text-gray-300 mb-4" size={32} />
                        <p className="text-sm font-bold text-gray-500">No competitors mapped for this account.</p>
                        <button className="mt-4 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-gray-100 transition-all">
                          Map First Rival
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-gray-900">Product Portfolio</h3>
                  <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                    <Plus size={16} /> Add Product
                  </button>
                </div>
                
                {products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase">{product.sku || 'No SKU'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">${(product.price || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{product.unit_of_measure || 'unit'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Package className="text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500 font-bold">No products in catalog.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-gray-900">Order History</h3>
                  <button 
                    onClick={() => setIsOrderDrawerOpen(true)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                  >
                    <Plus size={16} /> New Order
                  </button>
                </div>
                
                {orders.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {orders.map((order) => (
                      <div key={order.id} className="py-6 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                            <ShoppingBag size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase">
                              {new Date(order.created_at).toLocaleDateString()} • {order.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900 text-lg">${order.total_amount.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{(order.items || []).length} items</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ShoppingBag className="text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500 font-bold">No orders recorded for this account.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-gray-900">Field Observations</h3>
                  <button 
                    onClick={() => setIsNoteDrawerOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
                  >
                    <Plus size={16} /> New Entry
                  </button>
                </div>

                {/* Sub Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                  {noteSubTabs.map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveNoteSubTab(subTab.id as NoteSubTab)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        activeNoteSubTab === subTab.id
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
                
                {filteredNotes.length > 0 ? (
                  <div className="space-y-6">
                    {filteredNotes.map((note: StoreNoteResponse) => (
                      <div key={note.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            ['risk', 'threat'].includes(note.note_type || '') ? 'bg-red-100 text-red-600' :
                            note.note_type === 'opportunity' ? 'bg-green-100 text-green-600' :
                            note.note_type === 'anniversary' ? 'bg-purple-100 text-purple-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {note.note_type}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(note.created_at || '').toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-900 font-medium leading-relaxed">{note.note}</p>
                        {(note.risks || note.opportunities) && (
                          <div className="mt-4 pt-4 border-t border-gray-200/50 flex flex-col gap-3">
                            {note.risks && (
                              <div className="flex items-start gap-2 text-xs font-bold text-red-500">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>Risk: {note.risks}</span>
                              </div>
                            )}
                            {note.opportunities && (
                              <div className="flex items-start gap-2 text-xs font-bold text-green-600">
                                <TrendingUp size={14} className="shrink-0" />
                                <span>Opp: {note.opportunities}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="pt-8 flex justify-center">
                      <Link 
                        href={`/trade/notes?store=${store.name}`}
                        className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold text-sm uppercase tracking-widest transition-all group"
                      >
                        View Global Territory Intelligence
                        <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <Activity className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500 font-bold">No observations found for this category.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'referrals' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-gray-900">Campaign Referrals</h3>
                  <span className="bg-purple-100 text-purple-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    {referrals.length} Leads Referred
                  </span>
                </div>

                {referrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="py-4 px-2">Prospect / Construction Site</th>
                          <th className="py-4 px-2">Referred Date</th>
                          <th className="py-4 px-2">Contact Details</th>
                          <th className="py-4 px-2">Requested Product</th>
                          <th className="py-4 px-2">Qty</th>
                          <th className="py-4 px-2 text-right">Potential Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                        {referrals.map((ref: StoreResponse) => {
                          const product = products.find(p => p.id === ref.requested_product_id);
                          const productName = product ? product.name : 'Unknown Product';
                          
                          // PII Masking: If distributor_retailer, mask contact details
                          const isDistributor = currentUser?.role === 'distributor_retailer' || currentUser?.role === 'distributor';
                          
                          const phoneDisplay = ref.phone 
                            ? (isDistributor ? `${ref.phone.substring(0, 3)}****${ref.phone.substring(ref.phone.length - 2)}` : ref.phone)
                            : 'N/A';
                          
                          const emailDisplay = ref.email
                            ? (isDistributor ? 'Masked' : ref.email)
                            : 'N/A';

                          return (
                            <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 px-2">
                                <div className="font-bold text-gray-900">{ref.name}</div>
                                <div className="text-xs text-gray-400 font-medium">{ref.street_address || ref.address || 'No address'}</div>
                              </td>
                              <td className="py-4 px-2 text-xs text-gray-500 whitespace-nowrap">
                                {ref.referred_at ? new Date(ref.referred_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-4 px-2 text-xs text-gray-500">
                                <div>📞 {phoneDisplay}</div>
                                <div className="mt-1">✉️ {emailDisplay}</div>
                              </td>
                              <td className="py-4 px-2 font-bold text-gray-900">
                                {productName}
                              </td>
                              <td className="py-4 px-2 text-gray-500 font-bold">
                                {ref.requested_quantity || 0}
                              </td>
                              <td className="py-4 px-2 text-right font-black text-blue-600">
                                ${ref.potential_value ? ref.potential_value.toLocaleString() : '0'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <Users className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500 font-bold">No referrals found for this store.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Intelligence */}
        {showSalesIntelligence && (
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-900 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity size={120} />
            </div>
            <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
              Sherpa Intelligence
              <span className="bg-blue-500 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full">AI</span>
            </h3>
            
            <div className="space-y-6 relative z-10">
              <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Target size={18} />
                  </div>
                  <span className="text-sm font-bold">Current Playbook</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed font-medium">
                  "Upsell new plumbing line. Focus on the anniversary threat identified in the last visit."
                </p>
              </div>

              <div className="space-y-3">
                <IntelligenceMetric label="Engagement" value="High" color="text-green-400" />
                <IntelligenceMetric label="Churn Risk" value="Minimal" color="text-blue-400" />
                <IntelligenceMetric label="Next Suggested Visit" value="Next Tue" color="text-orange-400" />
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-900/50">
                Generate Full Brief
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Linked Contacts</h4>
            <div className="space-y-4">
              {store.clients && store.clients.length > 0 ? (
                store.clients.map((client: { id: string; name: string; role?: string | null }) => (
                  <div key={client.id} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{client.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{client.role || 'Primary Contact'}</p>
                    </div>
                    <ArrowUpRight size={14} className="ml-auto text-gray-200 group-hover:text-gray-900 transition-all" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 font-medium italic">No contacts linked.</p>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Drawers */}
      <FieldNoteDrawer 
        isOpen={isNoteDrawerOpen}
        onClose={() => setIsNoteDrawerOpen(false)}
        storeId={id as string}
        token={token}
      />

      <OrderDrawer 
        isOpen={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        preselectedStoreId={id as string}
        token={token}
      />
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

function InfoItem({ label, value, icon: Icon }: InfoItemProps) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">{label}</span>
        <span className="font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
}

interface IntelligenceMetricProps {
  label: string;
  value: string;
  color: string;
}

function IntelligenceMetric({ label, value, color }: IntelligenceMetricProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <span className="text-xs text-gray-400 font-bold">{label}</span>
      <span className={`text-xs font-black uppercase tracking-widest ${color}`}>{value}</span>
    </div>
  );
}
