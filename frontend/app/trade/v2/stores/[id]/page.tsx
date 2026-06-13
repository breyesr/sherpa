'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
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
  AlertCircle
} from 'lucide-react';
import { StoreResponse, StoreNoteResponse, OrderResponse, ProductResponse, CompetitorResponse } from '@/types/api';

type TabType = 'details' | 'products' | 'orders' | 'notes';
type NoteSubTab = 'all' | 'commercial' | 'marketing' | 'intel';

export default function StoreDetailPageV2() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [activeNoteSubTab, setActiveNoteSubTab] = useState<NoteSubTab>('all');

  // Fetch Store Detail
  const { data: store, isLoading, isFetched } = useQuery<StoreResponse>({
    queryKey: ['store', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Store not found');
      return res.json();
    },
    enabled: !!token && !!id,
  });

  // Fetch Store Orders
  const { data: orders = [] } = useQuery<OrderResponse[]>({
    queryKey: ['orders', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/orders?store_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && !!id,
  });

  // Fetch Competitors
  const { data: competitors = [] } = useQuery<CompetitorResponse[]>({
    queryKey: ['competitors', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/competitors?store_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && !!id,
  });

  // Fetch Products (Global catalog for now, could be filtered in future)
  const { data: products = [] } = useQuery<ProductResponse[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading || !token) return <div className="p-20 text-center font-bold text-gray-400">Loading Account Intelligence...</div>;
  if (isFetched && !store) return <div className="p-20 text-center font-bold text-red-500">Account not found</div>;

  const totalOrderValue = orders.reduce((sum, order) => sum + order.total_amount, 0);

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'notes', label: 'Timeline', icon: Activity },
  ];

  const noteSubTabs = [
    { id: 'all', label: 'All Observations' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'intel', label: 'Opps / Risks' },
  ];

  const filteredNotes = (store?.notes || []).filter((note: any) => {
    if (activeNoteSubTab === 'all') return true;
    
    if (activeNoteSubTab === 'intel') {
      return (
        ['risk', 'opportunity', 'threat', 'anniversary'].includes(note.note_type) ||
        !!note.risks ||
        !!note.opportunities
      );
    }
    
    return note.note_type === activeNoteSubTab;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Navigation */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-all" />
        Back to Accounts
      </button>

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex gap-4 items-center">
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
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tabs and Content */}
        <div className="lg:col-span-8 space-y-6">
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
                          <p className="font-black text-gray-900">${product.price.toFixed(2)}</p>
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
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
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
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{order.items.length} items</p>
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
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
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
                    {filteredNotes.map((note: any) => (
                      <div key={note.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            ['risk', 'threat'].includes(note.note_type) ? 'bg-red-100 text-red-600' :
                            note.note_type === 'opportunity' ? 'bg-green-100 text-green-600' :
                            note.note_type === 'anniversary' ? 'bg-purple-100 text-purple-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {note.note_type}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
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
                  </div>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <Activity className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500 font-bold">No observations found for this category.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Intelligence */}
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
                store.clients.map((client: any) => (
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
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }: any) {
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

function IntelligenceMetric({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <span className="text-xs text-gray-400 font-bold">{label}</span>
      <span className={`text-xs font-black uppercase tracking-widest ${color}`}>{value}</span>
    </div>
  );
}
