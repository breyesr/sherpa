'use client';

import Link from 'next/link';
import { 
  Users, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  ChevronRight,
  PlusCircle,
  Loader2,
  Clock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  ArrowUpRight,
  DollarSign,
  CheckCircle,
  ShoppingBag
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import SafeDate from '@/components/SafeDate';
import { components } from '@/types/api';
import { useState, useEffect } from 'react';
import { BrandButton, BrandBadge, BrandCard } from '@/components/ui/brand';
import { useAuthStore } from '@/store/authStore';

type BusinessProfileResponse = components['schemas']['BusinessProfileResponse'];
type AppointmentResponse = components['schemas']['AppointmentResponse'];

interface AttentionLead {
  id: string;
  name: string;
  prospect_segment: 'wholesale' | 'retail';
  created_at: string | null;
  total_revenue: number;
}

interface DashboardStats {
  today_appointments: number;
  total_clients: number;
  flagged_clients: number;
  upcoming: AppointmentResponse[];
  campaign_flow_enabled?: boolean;
  campaign_orders_count?: number;
  wholesale_leads_count?: number;
  retail_leads_count?: number;
  wholesale_pipeline_value?: number;
  retail_pipeline_value?: number;
  attention_leads?: AttentionLead[];
  verified_leads_count?: number;
  unverified_leads_count?: number;
  leads_count_30d?: number;
  verified_orders_count_30d?: number;
  verified_wholesale_leads_count?: number;
  verified_retail_leads_count?: number;
}

interface DashboardHomeProps {
  initialBusiness: BusinessProfileResponse;
  initialStats: DashboardStats;
  token: string | null;
}

export default function DashboardHome({ initialBusiness, initialStats, token }: DashboardHomeProps) {
  const { data: business = initialBusiness } = useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      return apiClient.get<BusinessProfileResponse>('/business/me');
    },
    initialData: initialBusiness,
    staleTime: 60 * 1000,
  });

  const { data: stats = initialStats, isFetching: isFetchingStats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      return apiClient.get<DashboardStats>('/business/stats');
    },
    initialData: initialStats,
    staleTime: 30 * 1000,
  });

  const queryClient = useQueryClient();
  const [verifyingLeads, setVerifyingLeads] = useState<Record<string, boolean>>({});
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    if (token && !useAuthStore.getState().token) {
      useAuthStore.setState({ token });
    }
  }, [token]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleVerifyLead = async (leadId: string) => {
    setVerifyingLeads(prev => ({ ...prev, [leadId]: true }));
    try {
      await apiClient.patch(`/trade/stores/${leadId}`, { is_verified: true });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      await queryClient.invalidateQueries({ queryKey: ['stores'] });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred while verifying');
    } finally {
      setVerifyingLeads(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const features = (business?.features_config || {
    scheduling: { enabled: true },
    business_identity: { enabled: true },
    crm_suite: { enabled: business?.vertical_type === 'BASIC' },
    campaign_flow: { enabled: business?.vertical_type === 'TRADE' },
    b2b_solutions: { enabled: business?.vertical_type === 'TRADE' },
    sales_intelligence: { enabled: business?.vertical_type === 'TRADE' },
    services: { enabled: business?.vertical_type === 'BASIC' },
    products: { enabled: business?.vertical_type === 'TRADE' }
  }) as Record<string, any>;

  const isCampaignFlow = (features.campaign_flow as { enabled?: boolean })?.enabled ?? false;

  if (isCampaignFlow) {
    const verified = stats.verified_leads_count || 0;
    const unverified = stats.unverified_leads_count || 0;
    const totalLeads = verified + unverified;
    const qualificationRate = totalLeads > 0 ? (verified / totalLeads) * 100 : 0;
    const wholesalePipeline = stats.wholesale_pipeline_value || 0;
    const retailPipeline = stats.retail_pipeline_value || 0;
    const totalPipeline = wholesalePipeline + retailPipeline;

    return (
      <div className="space-y-4 sm:space-y-8 pb-12 font-sans">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-deep tracking-tight flex items-center gap-3">
              {greeting}, {business?.name?.split(' ')[0] || 'there'}
              {isFetchingStats && <Loader2 className="w-5 h-5 text-dark-accent animate-spin" />}
            </h1>
            <p className="text-slate mt-1 sm:mt-1.5 font-medium text-xs sm:text-base">
              Here is your field intake pipeline status.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <Link href="/trade/entities/prospects/accounts?segment=wholesale">
              <BrandButton variant="secondary" size="md">
                <Users size={16} className="text-slate" />
                View Prospects
              </BrandButton>
            </Link>
            <Link href="/trade/entities/stores">
              <BrandButton variant="primary" size="md">
                <PlusCircle size={16} />
                Register Point of Sale
              </BrandButton>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Card 1: Total Intake */}
          <BrandCard hoverable className="relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 bg-ear text-deep rounded-xl flex items-center justify-center">
                  <ShoppingBag size={22} />
                </div>
                <BrandBadge variant="ear">
                  <span className="font-mono">{stats.campaign_orders_count || 0}</span> ORDERS
                </BrandBadge>
              </div>
              <div className="space-y-2 mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-deep tracking-tight">
                    {stats.leads_count_30d || 0}
                  </span>
                  <span className="text-xs font-semibold text-slate">Leads</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-deep/80 tracking-tight">
                    {stats.verified_orders_count_30d || 0}
                  </span>
                  <span className="text-xs font-semibold text-slate">Verified Orders</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate font-bold uppercase tracking-wider mt-6 pt-4 border-t border-utility">
              Total Intake (30d)
            </div>
          </BrandCard>

          {/* Card 2: Lead Composition */}
          <BrandCard hoverable className="relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 bg-memory text-deep rounded-xl flex items-center justify-center">
                  <Users size={22} />
                </div>
                <BrandBadge variant="memory">
                  <span className="font-mono">{stats.verified_wholesale_leads_count || 0}</span> WS · <span className="font-mono">{stats.verified_retail_leads_count || 0}</span> RT
                </BrandBadge>
              </div>
              <div className="space-y-2 mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-deep tracking-tight">
                    {stats.wholesale_leads_count || 0}
                  </span>
                  <span className="text-xs font-semibold text-slate">Wholesale Leads</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-deep/80 tracking-tight">
                    {stats.retail_leads_count || 0}
                  </span>
                  <span className="text-xs font-semibold text-slate">Retail Leads</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate font-bold uppercase tracking-wider mt-6 pt-4 border-t border-utility">
              Lead Composition
            </div>
          </BrandCard>

          {/* Card 3: Pipeline Value */}
          <BrandCard hoverable className="relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 bg-brain text-deep rounded-xl flex items-center justify-center">
                  <DollarSign size={22} />
                </div>
                <BrandBadge variant="brain">
                  Pipeline Active
                </BrandBadge>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-1 text-deep font-bold font-mono text-3xl tracking-tight leading-tight">
                  <span>${totalPipeline.toLocaleString()}</span>
                  <span className="text-xs font-semibold text-slate">MXN</span>
                </div>
                <div className="mt-2 text-xs font-medium text-slate">
                  Wholesale: <strong className="font-mono text-deep">${wholesalePipeline.toLocaleString()}</strong> · Retail: <strong className="font-mono text-deep">${retailPipeline.toLocaleString()}</strong>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate font-bold uppercase tracking-wider mt-6 pt-4 border-t border-utility">
              Pipeline Value
            </div>
          </BrandCard>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Funnel & Attention leads */}
          <div className="lg:col-span-2 space-y-8">
            {/* Funnel Progress Widget */}
            <BrandCard className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg text-deep">Intake funnel active pipeline</h2>
                <BrandBadge variant="confirmed">
                  Verified leads
                </BrandBadge>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-semibold text-slate">
                  <span>Progress to full verification</span>
                  <span className="font-mono font-bold text-deep">
                    {verified} / {totalLeads} ({qualificationRate.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-field h-3 rounded-full overflow-hidden border border-utility">
                  <div 
                    className="bg-deep h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${qualificationRate}%` }} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-field rounded-xl border border-utility">
                    <p className="text-[10px] text-slate font-bold uppercase tracking-wider">Verified Leads</p>
                    <p className="text-2xl font-bold font-mono text-deep mt-1">{verified}</p>
                  </div>
                  <div className="p-4 bg-field rounded-xl border border-utility">
                    <p className="text-[10px] text-slate font-bold uppercase tracking-wider">Unverified Leads</p>
                    <p className="text-2xl font-bold font-mono text-deep mt-1">{unverified}</p>
                  </div>
                </div>
              </div>
            </BrandCard>

            {/* Intake Leads Requiring Attention */}
            <div className="bg-white rounded-2xl border border-utility shadow-brand-subtle overflow-hidden">
              <div className="p-6 border-b border-utility flex justify-between items-center bg-field/40">
                <h2 className="font-bold text-lg text-deep">Intake leads requiring attention</h2>
                <BrandBadge variant="attention">
                  <span className="font-mono">{unverified}</span> Pending
                </BrandBadge>
              </div>

              {stats.attention_leads && stats.attention_leads.length > 0 ? (
                <div className="divide-y divide-utility">
                  {stats.attention_leads.map((lead: AttentionLead) => {
                    const isVerifyingLead = verifyingLeads[lead.id];
                    return (
                      <div key={lead.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-field/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-field border border-utility text-slate rounded-xl flex items-center justify-center shrink-0">
                            <UserIcon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-base text-deep">{lead.name}</p>
                              <BrandBadge variant={lead.prospect_segment === 'retail' ? 'memory' : 'hands'}>
                                {lead.prospect_segment || 'wholesale'}
                              </BrandBadge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate">
                              <span>Order: <strong className="font-mono text-deep">${lead.total_revenue.toLocaleString()} MXN</strong></span>
                              <span className="opacity-40">|</span>
                              {lead.created_at ? (
                                <span className="font-mono text-slate">
                                  {new Date(lead.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-slate">No date</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2.5 self-end sm:self-auto">
                          <Link href={`/trade/entities/prospects/accounts`}>
                            <BrandButton variant="secondary" size="sm">
                              Details
                            </BrandButton>
                          </Link>
                          <BrandButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleVerifyLead(lead.id)}
                            disabled={isVerifyingLead}
                          >
                            <CheckCircle size={14} />
                            {isVerifyingLead ? 'Verifying...' : 'Verify & Route'}
                          </BrandButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-field text-slate/50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-base font-bold text-deep">All leads addressed</h3>
                  <p className="text-slate text-xs font-medium mt-1">No unverified leads require immediate attention.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Assistant Hub */}
          <div className="space-y-6">
            <BrandCard className="space-y-6">
              <h2 className="font-bold text-lg text-deep border-b border-utility pb-3">Digital Brain Assistant Hub</h2>
              <div className="flex items-center justify-between p-3.5 bg-field rounded-xl border border-utility">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse" />
                  <span className="font-bold text-sm text-deep">{business?.assistant_config?.name || 'Xerpa AI'}</span>
                </div>
                <BrandBadge variant="confirmed">Active</BrandBadge>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate uppercase tracking-wider">Active Greeting</p>
                <p className="text-xs text-slate italic bg-field p-3.5 rounded-xl border border-utility leading-relaxed">
                  &quot;{business?.assistant_config?.greeting || 'Hello! How can I assist your route today?'}&quot;
                </p>
              </div>
              <Link href="/settings?tab=assistant" className="block">
                <BrandButton variant="secondary" size="md" className="w-full">
                  Tune Behavior
                </BrandButton>
              </Link>
            </BrandCard>

            {/* Campaign Outbox Info Card */}
            <div 
              className="rounded-2xl p-6 text-white space-y-4 relative overflow-hidden shadow-brand-subtle"
              style={{ backgroundColor: 'var(--deep)' }}
            >
              <div className="relative z-10">
                <h3 className="font-bold text-xl tracking-tight">Campaign Automations</h3>
                <p className="text-xs text-white/70 mt-2 leading-relaxed">
                  Outbound broadcasts and automated chat intake run actively in the background. Adjust templates and routes in settings.
                </p>
                <Link href="/settings?tab=integrations" className="block mt-6">
                  <BrandButton variant="accent" size="sm" className="w-full">
                    Manage Integrations
                  </BrandButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback Standard View
  return (
    <div className="space-y-8 pb-12 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-deep tracking-tight flex items-center gap-3">
            {greeting}, {business?.name?.split(' ')[0] || 'there'}
            {isFetchingStats && <Loader2 className="w-5 h-5 text-dark-accent animate-spin" />}
          </h1>
          <p className="text-slate mt-1.5 font-medium text-base">Here is your business briefing for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/calendar">
            <BrandButton variant="secondary" size="md">
              <CalendarIcon size={16} />
              View Schedule
            </BrandButton>
          </Link>
          <Link href="/calendar">
            <BrandButton variant="primary" size="md">
              <PlusCircle size={16} />
              Quick Book
            </BrandButton>
          </Link>
        </div>
      </div>

      {stats.flagged_clients > 0 && (
        <div className="bg-alert/10 border border-alert/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-alert text-white rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-deep">{stats.flagged_clients} clients need attention</h2>
              <p className="text-xs text-slate">The AI assistant hit a fallback and requested manual review.</p>
            </div>
          </div>
          <Link href="/conversations">
            <BrandButton variant="primary" size="sm">
              Review Now
            </BrandButton>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <BrandCard hoverable>
          <div className="w-12 h-12 bg-ear text-deep rounded-xl flex items-center justify-center mb-4">
            <CalendarIcon size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold font-mono text-deep tracking-tight">{stats.today_appointments}</p>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Today&apos;s Agenda</p>
          </div>
          <Link href="/calendar" className="text-deep text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all mt-4">
            Go to Calendar <ArrowUpRight size={14} />
          </Link>
        </BrandCard>

        <BrandCard hoverable>
          <div className="w-12 h-12 bg-memory text-deep rounded-xl flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold font-mono text-deep tracking-tight">{stats.total_clients}</p>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Client Base</p>
          </div>
          <Link href="/trade/entities/stores" className="text-deep text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all mt-4">
            Open Accounts <ArrowUpRight size={14} />
          </Link>
        </BrandCard>

        <BrandCard hoverable>
          <div className="w-12 h-12 bg-brain text-deep rounded-xl flex items-center justify-center mb-4">
            <MessageSquare size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold font-mono text-deep tracking-tight">
              {stats.flagged_clients === 0 ? 'All Clear' : 'Active'}
            </p>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">AI Assistant Status</p>
          </div>
          <Link href="/settings" className="text-deep text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all mt-4">
            Settings <ArrowUpRight size={14} />
          </Link>
        </BrandCard>
      </div>
    </div>
  );
}
