'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  Calendar,
  ChevronLeft,
  FileText,
  ShoppingBag,
  Store as StoreIcon,
  Activity,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Target,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Zap,
  ChevronRight,
  ExternalLink,
  Trash2,
  LucideIcon
} from 'lucide-react';
import { 
  Store as StoreModel, 
  Order as OrderModel, 
  CustomerNote as CustomerNoteModel, 
  ClientDetail as ClientDetailModel 
} from '@/types/models';
import { useTerminology } from '@/hooks/useTerminology';
import { BrandCard, BrandButton, BrandBadge } from '@/components/ui/brand';

type TabType = 'overview' | 'stores' | 'orders' | 'timeline';
type NoteSubTab = 'all' | 'commercial' | 'marketing' | 'intel';

export default function RetailerDetailPageV2() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const { t } = useTerminology();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activeNoteSubTab, setActiveNoteSubTab] = useState<NoteSubTab>('all');

  // Fetch Client Detail (Aggregated endpoint)
  const { data: detail, isLoading } = useQuery<ClientDetailModel>({
    queryKey: ['client-detail', id],
    queryFn: async () => {
      return await apiClient.get<ClientDetailModel>(`/crm/clients/${id}`);
    },
    enabled: !!token && !!id,
  });

  const noteSubTabs = [
    { id: 'all', label: 'All Observations' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'intel', label: 'Opps / Risks' },
  ];

  if (isLoading || !token) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-dark-accent border-t-transparent"></div>
        <span className="font-semibold text-slate text-sm">Consulting Xerpa Intelligence...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-4xl mx-auto p-12 font-sans">
        <BrandCard className="p-12 text-center flex flex-col items-center justify-center">
          <AlertCircle size={40} className="text-alert mb-4" />
          <h3 className="text-xl font-bold text-deep">Contact Not Found</h3>
          <p className="text-slate text-sm mt-1">The requested client contact does not exist or has been removed.</p>
          <div className="mt-6">
            <BrandButton variant="secondary" onClick={() => router.back()}>
              <ChevronLeft size={16} /> Go Back
            </BrandButton>
          </div>
        </BrandCard>
      </div>
    );
  }

  const { client, stores = [], trade_notes = [], orders = [] } = detail;
  const totalSpend = orders.reduce((sum: number, o: OrderModel) => sum + (o.total_amount || 0), 0);

  const filteredNotes = (trade_notes || []).filter((note: CustomerNoteModel) => {
    if (activeNoteSubTab === 'all') return true;
    if (activeNoteSubTab === 'intel') return note.risks || note.opportunities;
    return note.note_type === activeNoteSubTab;
  });

  const tabs = [
    { id: 'overview', label: 'Intelligence', icon: Sparkles },
    { id: 'stores', label: t('STORES', 'Accounts'), icon: StoreIcon },
    { id: 'orders', label: 'Order History', icon: ShoppingBag },
    { id: 'timeline', label: 'Field Reports', icon: Activity },
  ];

  return (
    <div id="v2-retailer-detail-container" className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Link 
          href={client?.is_prospect ? '/trade/entities/prospects/contacts' : '/trade/entities/retailers'}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate hover:text-deep transition-colors"
        >
          <ChevronLeft size={16} />
          {client?.is_prospect ? 'Back to Contacts' : 'Back to Clients'}
        </Link>
        <button
          onClick={async () => {
            const isProspect = client?.is_prospect;
            const term = isProspect ? 'contact' : 'client';
            if (confirm(`Are you sure you want to delete ${term} ${client?.name}?`)) {
              try {
                await apiClient.delete<void>(`/crm/clients/${client?.id}`);
                router.push(isProspect ? '/trade/entities/prospects/contacts' : '/trade/entities/retailers');
              } catch (err) {
                alert(`Failed to delete ${term}`);
              }
            }
          }}
          className="flex items-center gap-2 text-alert hover:bg-alert/10 font-bold transition-all px-3.5 py-2 rounded-xl text-xs border border-alert/20"
        >
          <Trash2 size={14} />
          Delete {client?.is_prospect ? 'Contact' : 'Client'}
        </button>
      </div>

      {/* Header Card */}
      <BrandCard className="p-8 md:p-10 relative overflow-hidden">
        <div className="relative flex flex-col lg:flex-row justify-between gap-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-20 h-20 bg-ear/20 text-deep rounded-2xl flex items-center justify-center border border-utility shadow-sm shrink-0">
              <UserIcon size={36} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <BrandBadge variant="confirmed">
                  Verified Contact
                </BrandBadge>
                <BrandBadge variant="neutral">
                  {client.role || 'Strategic Partner'}
                </BrandBadge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-deep tracking-tight mb-3">
                {client.name}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center gap-5 text-slate text-sm font-medium">
                {client.phone && (
                  <div className="flex items-center gap-2 font-mono">
                    <Phone size={15} className="text-slate" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-slate" />
                    <span>{client.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="bg-surface p-5 rounded-2xl border border-utility min-w-[150px]">
              <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Portfolio Value</span>
              <span className="text-2xl font-bold font-mono text-deep">${totalSpend.toLocaleString()}</span>
              <div className="flex items-center gap-1 text-confirmed text-[10px] font-bold mt-1 uppercase">
                <TrendingUp size={12} /> Active Ledger
              </div>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-utility min-w-[150px]">
              <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Managed Accounts</span>
              <span className="text-2xl font-bold font-mono text-deep">{stores.length}</span>
              <div className="flex items-center gap-1 text-dark-accent text-[10px] font-bold mt-1 uppercase">
                <StoreIcon size={12} /> Points of Sale
              </div>
            </div>
          </div>
        </div>
      </BrandCard>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Intelligence & Reports */}
        <div className="lg:col-span-8 space-y-6">
          {/* Custom Tabs */}
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
            {activeTab === 'overview' && (
              <div className="space-y-10">
                {/* Relationship & Profile Grid */}
                <section>
                  <h3 className="text-lg font-bold text-deep mb-6 flex items-center gap-2">
                    <Target size={18} className="text-dark-accent" />
                    Contact Context
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1: Relationship Dynamics */}
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate uppercase tracking-wider">Behavioral Context</span>
                        <h4 className="text-sm font-bold text-deep">Relationship Dynamics</h4>
                      </div>
                      <div className="space-y-3.5">
                        <DetailRow label="Preferred Comms" value={String((client.custom_fields as Record<string, unknown>)?.preferred_comms || 'WhatsApp')} icon={MessageSquare} />
                        <DetailRow label="Comm Style" value={trade_notes[0]?.comm_style || 'Professional / Direct'} icon={Zap} />
                        <DetailRow label="Visit Frequency" value={trade_notes[0]?.visit_frequency || 'Bi-Weekly'} icon={Calendar} />
                      </div>
                    </div>

                    {/* Column 2: Personal Profile */}
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate uppercase tracking-wider">Identity Context</span>
                        <h4 className="text-sm font-bold text-deep">Personal Profile</h4>
                      </div>
                      <div className="space-y-3.5">
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
                <div className="flex items-center justify-between pb-3 border-b border-utility">
                  <h3 className="text-lg font-bold text-deep">{t('STORES', 'Accounts')}</h3>
                  <BrandBadge variant="neutral">
                    <span className="font-mono">{stores.length}</span> ASSIGNED
                  </BrandBadge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stores.map((store: StoreModel) => (
                    <Link href={`/trade/entities/stores/${store.id}`} key={store.id} className="block group">
                      <div className="bg-surface rounded-2xl border border-utility p-5 hover:border-dark-accent transition-colors">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-utility/60">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-canvas rounded-lg flex items-center justify-center text-slate border border-utility">
                              <StoreIcon size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-deep text-sm group-hover:text-dark-accent transition-colors">{store.name}</p>
                              <p className="text-[10px] font-medium text-slate uppercase tracking-wider">{store.region || 'Region Unassigned'}</p>
                            </div>
                          </div>
                          <ArrowUpRight size={16} className="text-slate group-hover:text-deep transition-transform group-hover:translate-x-0.5" />
                        </div>
                        <div className="space-y-1.5 text-xs text-slate">
                          {store.phone && <p className="font-mono">Phone: {store.phone}</p>}
                          {store.address && <p className="truncate">{store.address}</p>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-deep pb-3 border-b border-utility">Direct Order History</h3>
                {orders.length > 0 ? (
                  <div className="divide-y divide-utility">
                    {orders.map((order: OrderModel) => (
                      <Link href={`/trade/operations/orders/${order.id}`} key={order.id} className="block group">
                        <div className="py-4 flex items-center justify-between hover:bg-surface/50 transition-colors rounded-xl px-3 -mx-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-slate border border-utility group-hover:bg-ear/20 group-hover:text-deep transition-colors">
                              <ShoppingBag size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-deep text-sm group-hover:text-dark-accent transition-colors font-mono">
                                #{order.id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-slate font-medium">
                                {new Date(order.created_at || '').toLocaleDateString()} • <span className="uppercase font-semibold">{order.status}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold font-mono text-deep text-base">${order.total_amount.toLocaleString()}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ShoppingBag className="text-slate mb-3" size={32} />
                    <p className="text-deep font-bold text-sm">No direct orders recorded for this contact.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-utility">
                  <h3 className="text-lg font-bold text-deep">Territory Intelligence Ledger</h3>
                </div>

                {/* Sub Tabs Filter */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                  {noteSubTabs.map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveNoteSubTab(subTab.id as NoteSubTab)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        activeNoteSubTab === subTab.id
                          ? 'bg-deep text-canvas shadow-sm'
                          : 'bg-surface text-slate hover:text-deep border border-utility'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
                
                {filteredNotes.length > 0 ? (
                  <div className="space-y-4">
                    {filteredNotes.map((note: CustomerNoteModel) => (
                      <div key={note.id} className="p-5 bg-surface rounded-2xl border border-utility space-y-3">
                        <div className="flex items-center justify-between">
                          <BrandBadge variant={['risk', 'threat'].includes(note.note_type || '') ? 'alert' : note.note_type === 'opportunity' ? 'confirmed' : 'neutral'}>
                            {note.note_type || 'OBSERVATION'}
                          </BrandBadge>
                          <span className="text-[11px] font-mono text-slate">{new Date(note.created_at || '').toLocaleDateString()}</span>
                        </div>
                        <p className="text-deep font-medium text-sm leading-relaxed italic">&quot;{note.general_notes}&quot;</p>
                        {(note.risks || note.opportunities) && (
                          <div className="pt-3 border-t border-utility/60 space-y-2 text-xs">
                            {note.risks && (
                              <div className="flex items-start gap-2 font-semibold text-alert">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>Risk: {note.risks}</span>
                              </div>
                            )}
                            {note.opportunities && (
                              <div className="flex items-start gap-2 font-semibold text-confirmed">
                                <TrendingUp size={14} className="shrink-0 mt-0.5" />
                                <span>Opportunity: {note.opportunities}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Pulse Deep Link */}
                    <div className="pt-6 flex justify-center">
                      <Link 
                        href={`/trade/operations/notes`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate hover:text-deep transition-colors px-6 py-2.5 bg-surface rounded-full border border-utility"
                      >
                        Launch Global Pulse Explorer
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-surface rounded-2xl border border-utility">
                    <Activity className="mx-auto text-slate mb-3" size={32} />
                    <h4 className="text-base font-bold text-deep mb-1">No Reports Synchronized</h4>
                    <p className="text-slate text-xs max-w-xs mx-auto">Field observations from visits or AI analysis will materialize here.</p>
                  </div>
                )}
              </div>
            )}
          </BrandCard>
        </div>

        {/* Right Column: Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <BrandCard className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-utility">
              <div>
                <h3 className="text-lg font-bold text-deep flex items-center gap-2">
                  Intelligence Dossier
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-dark-accent animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate">Listening Active</span>
                </div>
              </div>
              <div className="w-9 h-9 bg-ear/20 text-deep rounded-xl flex items-center justify-center">
                <Sparkles size={16} />
              </div>
            </div>

            {/* Strategic Brief Block */}
            <div className="p-4 bg-surface rounded-xl border border-utility space-y-2">
              <div className="flex items-center gap-1.5 text-slate">
                <FileText size={13} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Account Brief</span>
              </div>
              <p className="text-xs text-deep leading-relaxed font-medium italic">
                &quot;{client.name} is a key decision maker for {stores.length} locations. 
                Communication style is direct and efficiency-focused.&quot;
              </p>
            </div>

            {/* Scoring Section */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate block px-1">Performance Matrix</span>
              <IntelligenceMetricRow label="Engagement" value="Consistent" variant="confirmed" />
              <IntelligenceMetricRow label="Trust Score" value="9.4 / 10" variant="accent" />
              <IntelligenceMetricRow label="Propensity" value="High" variant="confirmed" />
            </div>

            {/* Partner Data Section */}
            <div className="pt-4 border-t border-utility space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate block px-1">Verified Metadata</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate font-medium">Birthday</span>
                  <span className="font-mono font-semibold text-deep bg-surface px-2.5 py-0.5 rounded border border-utility">
                    {client.birthday || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate font-medium">Channel Link</span>
                  <BrandBadge variant={client.telegram_id_hash ? 'confirmed' : 'neutral'}>
                    {client.telegram_id_hash ? 'LINKED' : 'PENDING'}
                  </BrandBadge>
                </div>
              </div>
            </div>
          </BrandCard>
        </div>
      </div>
    </div>
  );
}

interface IntelligenceMetricRowProps {
  label: string;
  value: string;
  variant: 'neutral' | 'confirmed' | 'accent';
}

function IntelligenceMetricRow({ label, value, variant }: IntelligenceMetricRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-utility">
      <span className="text-xs text-slate font-medium">{label}</span>
      <BrandBadge variant={variant}>
        {value}
      </BrandBadge>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

function DetailRow({ label, value, icon: Icon }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs font-bold text-slate uppercase tracking-wider">
        <Icon size={13} />
        {label}
      </div>
      <span className="text-sm font-bold text-deep font-mono">{value}</span>
    </div>
  );
}
