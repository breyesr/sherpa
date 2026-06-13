'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  Calendar,
  ChevronLeft,
  FileText,
  ShoppingBag,
  Store,
  Activity,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Target,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Zap,
  ChevronRight
} from 'lucide-react';
import { ClientResponse, StoreResponse, OrderResponse } from '@/types/api';

type TabType = 'overview' | 'stores' | 'orders' | 'timeline';

export default function RetailerDetailPageV2() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Fetch Client Detail (Aggregated endpoint)
  const { data: detail, isLoading, isFetched } = useQuery({
    queryKey: ['client-detail', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/crm/clients/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Client not found');
      return res.json();
    },
    enabled: !!token && !!id,
  });

  if (isLoading || !token) return <div className="p-20 text-center font-bold text-gray-400 italic animate-pulse">Consulting Sherpa Intelligence...</div>;
  if (isFetched && !detail) return <div className="p-20 text-center font-bold text-red-500">Contact not found</div>;

  const { client, stores = [], trade_notes = [], orders = [] } = detail;
  const totalSpend = orders.reduce((sum: number, o: any) => sum + o.total_amount, 0);

  const tabs = [
    { id: 'overview', label: 'Intelligence', icon: Sparkles },
    { id: 'stores', label: 'Stores', icon: Store },
    { id: 'orders', label: 'Order History', icon: ShoppingBag },
    { id: 'timeline', label: 'Field Reports', icon: Activity },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Navigation */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-all" />
        Back to Contacts
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/40 rounded-full blur-3xl -mr-40 -mt-40" />
        
        <div className="relative flex flex-col lg:flex-row justify-between gap-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-24 h-24 bg-gray-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-gray-200 shrink-0">
              <UserIcon size={48} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Verified Contact
                </span>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-gray-200">
                  {client.role || 'Strategic Partner'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
                {client.name}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center gap-6 text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <Phone size={18} className="text-blue-500" />
                  <span>{client.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-orange-500" />
                  <span>{client.email || 'No email'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 min-w-[160px]">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Portfolio Value</span>
              <span className="text-2xl font-black text-gray-900">${totalSpend.toLocaleString()}</span>
              <div className="flex items-center gap-1 text-green-600 text-[10px] font-bold mt-1 uppercase">
                <TrendingUp size={12} /> High Growth
              </div>
            </div>
            <div className="bg-gray-900 p-6 rounded-[2rem] min-w-[160px]">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Managed Points</span>
              <span className="text-2xl font-black text-white">{stores.length} Stores</span>
              <div className="flex items-center gap-1 text-blue-400 text-[10px] font-bold mt-1 uppercase">
                <Store size={12} /> Network
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Intelligence & Reports */}
        <div className="lg:col-span-8 space-y-6">
          {/* Custom Tabs */}
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

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 min-h-[500px]">
            {activeTab === 'overview' && (
              <div className="space-y-12">
                {/* Relationship & Profile Grid */}
                <section>
                  <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                    <Target size={20} className="text-orange-500" />
                    Contact Context
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                    {/* Column 1: Relationship Dynamics */}
                    <div className="space-y-8">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Behavioral Context</span>
                        <h4 className="text-sm font-bold text-gray-900">Relationship Dynamics</h4>
                      </div>
                      <div className="space-y-4">
                        <DetailRow label="Preferred Comms" value={client.custom_fields?.preferred_comms || 'WhatsApp'} icon={MessageSquare} />
                        <DetailRow label="Comm Style" value={trade_notes[0]?.comm_style || 'Professional / Direct'} icon={Zap} />
                        <DetailRow label="Visit Frequency" value={trade_notes[0]?.visit_frequency || 'Bi-Weekly'} icon={Calendar} />
                      </div>
                    </div>

                    {/* Column 2: Personal Profile */}
                    <div className="space-y-8">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Identity Context</span>
                        <h4 className="text-sm font-bold text-gray-900">Personal Profile</h4>
                      </div>
                      <div className="space-y-4">
                        <DetailRow label="Primary Role" value={client.role || 'Partner Retailer'} icon={UserIcon} />
                        <DetailRow label="Birthday" value={client.birthday || 'Not recorded'} icon={Calendar} />
                        <DetailRow label="Gender" value={client.gender || 'Not specified'} icon={Target} />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'stores' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-gray-900">Stores</h3>
                  <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                    <Plus size={16} /> Link Store
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stores.map((store: any) => (
                    <div key={store.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:border-blue-200 transition-all">
                      <div className="p-6 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-500">
                            <Store size={20} />
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{store.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{store.region || 'Region Unassigned'}</p>
                          </div>
                        </div>
                        <ArrowUpRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-all" />
                      </div>
                      <div className="p-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <Phone size={14} /> {store.phone || 'No phone'}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <Target size={14} /> {store.market || 'General Market'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-gray-900 mb-4">Direct Order History</h3>
                {orders.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {orders.map((order: any) => (
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
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ShoppingBag className="text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500 font-bold">No direct orders recorded for this contact.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-gray-900">Field Reports</h3>
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                    <Plus size={16} /> New Entry
                  </button>
                </div>
                
                {trade_notes.length > 0 ? (
                  <div className="space-y-6">
                    {trade_notes.map((note: any) => (
                      <div key={note.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-gray-900 text-white rounded-md">
                            Interaction
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-900 font-medium leading-relaxed">{note.general_notes}</p>
                        {note.preferred_actions && (
                          <div className="mt-4 pt-4 border-t border-gray-200/50">
                            <div className="flex items-start gap-2 text-xs font-bold text-blue-600">
                              <Target size={14} className="shrink-0" />
                              <span>Action: {note.preferred_actions}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <Activity className="mx-auto text-gray-300 mb-4" size={32} />
                    <p className="text-gray-500 font-bold">No field reports found for this contact.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0F172A] text-white rounded-[3rem] p-8 shadow-2xl relative overflow-hidden border border-white/5">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />

            <div className="relative z-10 space-y-8">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    Intelligence
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Sherpa AI Active</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <Sparkles size={20} className="text-blue-400" />
                </div>
              </div>

              {/* Strategic Brief Block */}
              <div className="bg-gradient-to-br from-white/5 to-transparent p-6 rounded-[2rem] border border-white/10 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <FileText size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Account Brief</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-medium italic">
                  "{client.name} is a key decision maker for {stores.length} locations. 
                  Recently showed interest in expanding the beverage category. 
                  Communication style is direct and efficiency-focused."
                </p>
              </div>

              {/* Scoring Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-500 px-1">
                  <Activity size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Performance Matrix</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <IntelligenceMetricRow label="Engagement" value="Consistent" color="text-green-400" bg="bg-green-400/10" />
                  <IntelligenceMetricRow label="Trust Score" value="9.4 / 10" color="text-blue-400" bg="bg-blue-400/10" />
                  <IntelligenceMetricRow label="Propensity" value="High" color="text-purple-400" bg="bg-purple-400/10" />
                </div>
              </div>

              {/* Partner Data Section */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-gray-500 px-1">
                  <UserIcon size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verified Metadata</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center group cursor-default">
                    <span className="text-xs text-gray-400 font-bold">Birthday</span>
                    <span className="text-xs font-black text-gray-100 bg-white/5 px-3 py-1 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors">
                      {client.birthday || 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center group cursor-default">
                    <span className="text-xs text-gray-400 font-bold">Telegram</span>
                    <span className={`text-xs font-black px-3 py-1 rounded-lg border transition-colors ${
                      client.telegram_id_hash 
                        ? 'text-blue-400 bg-blue-400/5 border-blue-400/20 group-hover:bg-blue-400/10' 
                        : 'text-gray-500 bg-white/5 border-white/5 group-hover:bg-white/10'
                    }`}>
                      {client.telegram_id_hash ? 'LINKED' : 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Action */}
              <button className="w-full group relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-blue-900/40 active:scale-[0.98]">
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <span>Generate Full Dossier</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelligenceMetricRow({ label, value, color, bg }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors group">
      <span className="text-xs text-gray-400 font-bold">{label}</span>
      <div className={`px-3 py-1 ${bg} ${color} rounded-lg text-[10px] font-black uppercase tracking-wider border border-current/20`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
        <Icon size={14} />
        {label}
      </div>
      <span className="text-sm font-black text-gray-900">{value}</span>
    </div>
  );
}
