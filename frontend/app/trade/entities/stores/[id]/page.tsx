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
import { useDrawerStore } from '@/lib/store/DrawerManager';
import { useTerminology } from '@/hooks/useTerminology';
import { BrandCard, BrandButton, BrandBadge } from '@/components/ui/brand';

type TabType = 'details' | 'products' | 'orders' | 'notes' | 'referrals';
type NoteSubTab = 'all' | 'commercial' | 'marketing' | 'intel';

export default function StoreDetailPageV2() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const { t } = useTerminology();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [activeNoteSubTab, setActiveNoteSubTab] = useState<NoteSubTab>('all');
  const openDrawer = useDrawerStore((s) => s.openDrawer);

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
    <div id="v2-store-detail-container" className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Link 
          href={store?.is_prospect ? '/trade/entities/prospects/accounts' : '/trade/entities/stores'}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate hover:text-deep transition-colors"
        >
          <ChevronLeft size={16} />
          {store?.is_prospect ? 'Back to Prospects' : (showSalesIntelligence ? 'Back to Accounts' : 'Back to Points of Sale')}
        </Link>
        <button
          onClick={async () => {
            const isProspect = store?.is_prospect;
            const term = isProspect ? 'prospect account' : 'store';
            if (confirm(`Are you sure you want to delete ${term} ${store?.name}?`)) {
              try {
                await apiClient.delete<void>(`/trade/stores/${store?.id}`);
                router.push(isProspect ? '/trade/entities/prospects/accounts' : '/trade/entities/stores');
              } catch {
                alert(`Failed to delete ${term}`);
              }
            }
          }}
          className="flex items-center gap-2 text-alert hover:bg-alert/10 font-bold transition-all px-3.5 py-2 rounded-xl text-xs border border-alert/20"
        >
          <Trash2 size={14} />
          Delete {store?.is_prospect ? 'Prospect Account' : 'Account'}
        </button>
      </div>

      {/* Header Card */}
      <BrandCard className="p-8 md:p-10 relative overflow-hidden">
        <div className="relative flex flex-col lg:flex-row justify-between gap-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-20 h-20 bg-ear/20 text-deep rounded-2xl flex items-center justify-center border border-utility shadow-sm shrink-0">
              <StoreIcon size={36} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <BrandBadge variant="confirmed">
                  Active Account
                </BrandBadge>
                <BrandBadge variant="neutral">
                  {store.segment || 'General'}
                </BrandBadge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-deep tracking-tight mb-3">
                {store.name}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center gap-5 text-slate text-sm font-medium">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-slate" />
                  <span>{store.address || 'No address registered'}</span>
                </div>
                {store.region && (
                  <div className="flex items-center gap-2 font-mono">
                    <Target size={15} className="text-dark-accent" />
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
                <div className="bg-surface p-5 rounded-2xl border border-utility min-w-[140px]">
                  <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Total Sales</span>
                  <span className="text-2xl font-bold font-mono text-deep">${totalOrderValue.toLocaleString()}</span>
                  <div className="flex items-center gap-1 text-confirmed text-[10px] font-bold mt-1 uppercase">
                    <TrendingUp size={12} /> {orders.length} Orders
                  </div>
                </div>
                <div className="bg-surface p-5 rounded-2xl border border-utility min-w-[140px]">
                  <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Avg. Ticket</span>
                  <span className="text-2xl font-bold font-mono text-deep">
                    ${orders.length > 0 ? (totalOrderValue / orders.length).toFixed(0) : '0'}
                  </span>
                  <div className="flex items-center gap-1 text-dark-accent text-[10px] font-bold mt-1 uppercase">
                    <ShoppingBag size={12} /> Per Order
                  </div>
                </div>
              </>
            )}
            {showCampaigns && (
              <div className="bg-surface p-5 rounded-2xl border border-utility min-w-[140px]">
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Referrals Value</span>
                <span className="text-2xl font-bold font-mono text-deep">${totalReferralPipelineValue.toLocaleString()}</span>
                <div className="flex items-center gap-1 text-dark-accent text-[10px] font-bold mt-1 uppercase">
                  <Users size={12} /> {referrals.length} Referrals
                </div>
              </div>
            )}
          </div>
        </div>
      </BrandCard>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tabs and Content */}
        <div className={`space-y-6 ${showSalesIntelligence ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <div className="bg-surface p-1.5 rounded-2xl border border-utility flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-canvas text-deep shadow-sm border border-utility' 
                    : 'text-slate hover:text-deep hover:bg-canvas/50'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          <BrandCard className="p-8 min-h-[460px]">
            {activeTab === 'details' && (
              <div className="space-y-10">
                <section>
                  <h3 className="text-lg font-bold text-deep mb-6 flex items-center gap-2">
                    <FileText size={18} className="text-dark-accent" />
                    General Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InfoItem label="Full Name" value={store.name} icon={StoreIcon} />
                    <InfoItem label="Physical Address" value={store.address || 'Not specified'} icon={MapPin} />
                    <InfoItem label="Phone Number" value={store.phone || 'Not available'} icon={Phone} />
                    <InfoItem label="Email Address" value={store.email || 'Not available'} icon={Mail} />
                  </div>
                </section>

                <section className="pt-8 border-t border-utility">
                  <h3 className="text-lg font-bold text-deep mb-6 flex items-center gap-2">
                    <Target size={18} className="text-dark-accent" />
                    Market Context
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-surface p-5 rounded-2xl border border-utility">
                      <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Market</span>
                      <span className="font-bold text-deep text-base">{store.market || 'Unassigned'}</span>
                    </div>
                    <div className="bg-surface p-5 rounded-2xl border border-utility">
                      <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Segment</span>
                      <span className="font-bold text-deep text-base">{store.segment || 'General'}</span>
                    </div>
                    <div className="bg-surface p-5 rounded-2xl border border-utility">
                      <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Region</span>
                      <span className="font-bold text-deep text-base">{store.region || 'Unknown'}</span>
                    </div>
                  </div>
                </section>

                {showSalesIntelligence && (
                  <section className="pt-8 border-t border-utility">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-deep flex items-center gap-2">
                        <TrendingUp size={18} className="text-dark-accent" />
                        Competitive Matrix
                      </h3>
                      <button className="text-xs font-bold uppercase tracking-wider text-dark-accent hover:underline transition-colors">
                        + Add Rival
                      </button>
                    </div>

                    {competitors.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {competitors.map((rival) => (
                          <div key={rival.id} className="bg-surface rounded-2xl border border-utility overflow-hidden flex flex-col group hover:border-utility/80 transition-all">
                            <div className="p-5 bg-surface/50 border-b border-utility flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-canvas rounded-xl flex items-center justify-center text-slate border border-utility shadow-sm">
                                  <Activity size={18} />
                                </div>
                                <div>
                                  <p className="font-bold text-deep text-sm">{rival.name}</p>
                                  <p className="text-[10px] font-bold text-slate uppercase tracking-wider">{`${t('STORE', 'Account')} Rival`}</p>
                                </div>
                              </div>
                              <BrandBadge variant={
                                rival.presence_level?.toLowerCase() === 'high' ? 'alert' :
                                rival.presence_level?.toLowerCase() === 'medium' ? 'pending' :
                                'confirmed'
                              }>
                                {rival.presence_level || 'Low'} Presence
                              </BrandBadge>
                            </div>
                            
                            <div className="p-5 grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-confirmed uppercase tracking-wider flex items-center gap-1.5">
                                  <ArrowUpRight size={12} /> Strengths
                                </span>
                                <p className="text-xs font-medium text-slate leading-relaxed italic">
                                  {rival.strengths || 'No specific strengths recorded.'}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-alert uppercase tracking-wider flex items-center gap-1.5">
                                  <AlertCircle size={12} /> Weaknesses
                                </span>
                                <p className="text-xs font-medium text-slate leading-relaxed italic">
                                  {rival.weaknesses || 'No identified weaknesses.'}
                                </p>
                              </div>
                            </div>

                            <div className="px-5 pb-5 mt-auto">
                              <div className="pt-3.5 border-t border-utility flex items-center justify-between">
                                <span className="text-[10px] font-mono text-slate">Updated {new Date(rival.updated_at).toLocaleDateString()}</span>
                                <button className="text-xs font-bold text-deep hover:text-dark-accent transition-colors">Details</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-surface rounded-2xl border-2 border-dashed border-utility py-12 text-center">
                        <TrendingUp className="mx-auto text-slate mb-3" size={28} />
                        <p className="text-sm font-semibold text-slate">No competitors mapped for this account.</p>
                        <BrandButton variant="secondary" size="sm" className="mt-4">
                          Map First Rival
                        </BrandButton>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-deep">Product Portfolio</h3>
                  <BrandButton size="sm" onClick={() => openDrawer('catalog', {})}>
                    <Plus size={14} className="mr-1.5" /> Add Product
                  </BrandButton>
                </div>
                
                {products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <Link 
                        key={product.id} 
                        href={`/trade/catalog/products/${product.id}`}
                        className="p-4 bg-surface rounded-2xl border border-utility flex items-center justify-between group hover:border-utility/80 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-canvas rounded-xl flex items-center justify-center text-slate border border-utility shadow-sm group-hover:text-deep transition-all">
                            <Package size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-deep group-hover:text-dark-accent transition-colors">{product.name}</p>
                            <p className="text-xs text-slate font-mono uppercase">{product.sku || 'No SKU'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold font-mono text-deep">${(product.price || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-slate font-bold uppercase">{product.unit_of_measure || 'unit'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Package className="text-slate mb-3" size={28} />
                    <p className="text-slate text-sm font-semibold">No products in catalog.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-deep">Order History</h3>
                  <BrandButton 
                    size="sm"
                    onClick={() => openDrawer('order', { preselectedStoreId: id as string })}
                  >
                    <Plus size={14} className="mr-1.5" /> New Order
                  </BrandButton>
                </div>
                
                {orders.length > 0 ? (
                  <div className="divide-y divide-utility">
                    {orders.map((order) => (
                      <Link 
                        key={order.id} 
                        href={`/trade/operations/orders/${order.id}`}
                        className="py-5 flex items-center justify-between group hover:bg-surface/50 px-3 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-surface rounded-xl flex items-center justify-center text-slate border border-utility group-hover:text-dark-accent transition-all">
                            <ShoppingBag size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-deep font-mono text-sm group-hover:text-dark-accent transition-colors">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-slate font-mono uppercase">
                              {new Date(order.created_at).toLocaleDateString()} • {order.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold font-mono text-deep text-base">${order.total_amount.toLocaleString()}</p>
                          <p className="text-[10px] text-slate font-bold uppercase">{(order.items || []).length} items</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ShoppingBag className="text-slate mb-3" size={28} />
                    <p className="text-slate text-sm font-semibold">No orders recorded for this account.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-deep">Field Observations</h3>
                  <BrandButton 
                    size="sm"
                    onClick={() => openDrawer('fieldNote', { storeId: id as string })}
                  >
                    <Plus size={14} className="mr-1.5" /> New Entry
                  </BrandButton>
                </div>

                {/* Sub Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                  {noteSubTabs.map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveNoteSubTab(subTab.id as NoteSubTab)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        activeNoteSubTab === subTab.id
                          ? 'bg-deep text-canvas'
                          : 'bg-surface text-slate hover:text-deep border border-utility'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
                
                {filteredNotes.length > 0 ? (
                  <div className="space-y-4">
                    {filteredNotes.map((note: StoreNoteResponse) => (
                      <div key={note.id} className="p-5 bg-surface rounded-2xl border border-utility">
                        <div className="flex items-center justify-between mb-3">
                          <BrandBadge variant={
                            ['risk', 'threat'].includes(note.note_type || '') ? 'alert' :
                            note.note_type === 'opportunity' ? 'confirmed' :
                            'neutral'
                          }>
                            {note.note_type}
                          </BrandBadge>
                          <span className="text-[10px] font-mono text-slate">{new Date(note.created_at || '').toLocaleDateString()}</span>
                        </div>
                        <p className="text-deep text-sm leading-relaxed">{note.note}</p>
                        {(note.risks || note.opportunities) && (
                          <div className="mt-3.5 pt-3.5 border-t border-utility flex flex-col gap-2">
                            {note.risks && (
                              <div className="flex items-start gap-2 text-xs font-bold text-alert">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>Risk: {note.risks}</span>
                              </div>
                            )}
                            {note.opportunities && (
                              <div className="flex items-start gap-2 text-xs font-bold text-confirmed">
                                <TrendingUp size={14} className="shrink-0 mt-0.5" />
                                <span>Opp: {note.opportunities}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="pt-6 flex justify-center">
                      <Link 
                        href={`/trade/operations/notes?store=${encodeURIComponent(store.name)}`}
                        className="inline-flex items-center gap-2 text-slate hover:text-dark-accent font-semibold text-xs uppercase tracking-wider transition-colors group"
                      >
                        View Global Territory Intelligence
                        <ExternalLink size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-surface rounded-2xl border-2 border-dashed border-utility">
                    <Activity className="mx-auto text-slate mb-3" size={28} />
                    <p className="text-slate text-sm font-semibold">No observations found for this category.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'referrals' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-deep">Campaign Referrals</h3>
                  <BrandBadge variant="accent">
                    {referrals.length} Leads Referred
                  </BrandBadge>
                </div>

                {referrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-utility text-[10px] font-bold text-slate uppercase tracking-wider">
                          <th className="py-3 px-2">Prospect / Account Name</th>
                          <th className="py-3 px-2">Referred Date</th>
                          <th className="py-3 px-2">Contact Details</th>
                          <th className="py-3 px-2">Requested Product</th>
                          <th className="py-3 px-2">Qty</th>
                          <th className="py-3 px-2 text-right">Potential Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-utility text-sm font-medium text-slate">
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
                            <tr key={ref.id} className="hover:bg-surface/50 transition-colors">
                              <td className="py-3 px-2">
                                <div className="font-bold text-deep">{ref.name}</div>
                                <div className="text-xs text-slate font-normal">{ref.street_address || ref.address || 'No address'}</div>
                              </td>
                              <td className="py-3 px-2 text-xs font-mono text-slate whitespace-nowrap">
                                {ref.referred_at ? new Date(ref.referred_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3 px-2 text-xs text-slate font-mono">
                                <div>📞 {phoneDisplay}</div>
                                <div className="mt-0.5">✉️ {emailDisplay}</div>
                              </td>
                              <td className="py-3 px-2 font-bold text-deep">
                                {productName}
                              </td>
                              <td className="py-3 px-2 text-deep font-mono font-bold">
                                {ref.requested_quantity || 0}
                              </td>
                              <td className="py-3 px-2 text-right font-mono font-bold text-deep">
                                ${ref.potential_value ? ref.potential_value.toLocaleString() : '0'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-surface rounded-2xl border-2 border-dashed border-utility">
                    <Users className="mx-auto text-slate mb-3" size={28} />
                    <p className="text-slate text-sm font-semibold">No referrals found for this store.</p>
                  </div>
                )}
              </div>
            )}
          </BrandCard>
        </div>

        {/* Sidebar Intelligence */}
        {showSalesIntelligence && (
        <div className="lg:col-span-4 space-y-6">
          <BrandCard className="p-7 relative overflow-hidden bg-gradient-to-br from-surface to-surface/40">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-deep flex items-center gap-2">
                Account Intelligence
              </h3>
              <BrandBadge variant="accent">
                AI
              </BrandBadge>
            </div>
            
            <div className="space-y-5 relative z-10">
              <div className="bg-canvas p-5 rounded-2xl border border-utility shadow-sm">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-7 h-7 bg-ear/30 rounded-lg flex items-center justify-center text-deep">
                    <Target size={15} />
                  </div>
                  <span className="text-xs font-bold text-deep uppercase tracking-wider">Current Playbook</span>
                </div>
                <p className="text-xs text-slate leading-relaxed font-medium italic">
                  "Upsell key product line based on recent engagement trends."
                </p>
              </div>

              <div className="space-y-2">
                <IntelligenceMetric label="Engagement" value="High" color="text-confirmed" />
                <IntelligenceMetric label="Churn Risk" value="Minimal" color="text-dark-accent" />
                <IntelligenceMetric label="Next Suggested Visit" value="Next Tue" color="text-slate" />
              </div>

              <BrandButton className="w-full">
                Generate Full Brief
              </BrandButton>
            </div>
          </BrandCard>

          <BrandCard className="p-7">
            <h4 className="text-xs font-bold text-slate uppercase tracking-wider mb-5">Linked Contacts</h4>
            <div className="space-y-3.5">
              {store.clients && store.clients.length > 0 ? (
                store.clients.map((client: { id: string; name: string; role?: string | null }) => (
                  <Link 
                    key={client.id} 
                    href="/trade/entities/prospects/contacts"
                    className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-surface transition-colors group"
                  >
                    <div className="w-9 h-9 bg-surface rounded-xl flex items-center justify-center text-slate border border-utility group-hover:text-deep transition-all">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-deep text-sm group-hover:text-dark-accent transition-colors">{client.name}</p>
                      <p className="text-[10px] text-slate font-bold uppercase tracking-tight">{client.role || 'Primary Contact'}</p>
                    </div>
                    <ArrowUpRight size={14} className="ml-auto text-slate group-hover:text-deep transition-all" />
                  </Link>
                ))
              ) : (
                <p className="text-xs text-slate font-medium italic">No contacts linked.</p>
              )}
            </div>
          </BrandCard>
        </div>
        )}
      </div>

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
      <div className="w-10 h-10 bg-canvas rounded-xl flex items-center justify-center text-slate border border-utility shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-0.5">{label}</span>
        <span className="font-bold text-deep">{value}</span>
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
    <div className="flex items-center justify-between py-2 border-b border-utility">
      <span className="text-xs text-slate font-semibold">{label}</span>
      <span className={`text-xs font-mono font-bold uppercase tracking-wider ${color}`}>{value}</span>
    </div>
  );
}
