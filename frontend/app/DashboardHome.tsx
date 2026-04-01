'use client';

import Link from 'next/link';
import { 
  Users, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  ChevronRight,
  PlusCircle,
  Bell,
  Loader2,
  Clock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Scissors,
  ArrowUpRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';

interface DashboardHomeProps {
  initialBusiness: any;
  initialStats: any;
  token: string | null;
}

export default function DashboardHome({ initialBusiness, initialStats, token }: DashboardHomeProps) {
  const { data: business = initialBusiness } = useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/business/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch business');
      return res.json();
    },
    initialData: initialBusiness,
    staleTime: 60 * 1000,
  });

  const { data: stats = initialStats, isFetching: isFetchingStats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/business/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    initialData: initialStats,
    staleTime: 30 * 1000,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            {getGreeting()}, {business?.name?.split(' ')[0] || 'there'}!
            {isFetchingStats && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">Here's your business briefing for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/calendar" 
            className="flex items-center gap-2 bg-white border border-gray-200 px-5 py-3 rounded-2xl text-sm font-bold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
          >
            <CalendarIcon size={18} className="text-gray-400" />
            View Schedule
          </Link>
          <Link 
            href="/calendar" 
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <PlusCircle size={18} />
            Quick Book
          </Link>
        </div>
      </div>

      {/* Action Alerts - High Priority */}
      {stats.flagged_clients > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <AlertCircle size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900">{stats.flagged_clients} Clients Need Attention</h2>
              <p className="text-red-700 font-medium">The AI assistant hit a fallback and requested manual review.</p>
            </div>
          </div>
          <Link 
            href="/crm"
            className="px-8 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <CalendarIcon size={28} />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-gray-900">{stats.today_appointments}</p>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Today's Agenda</p>
          </div>
          <Link href="/calendar" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all mt-6">
            Go to Calendar <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Users size={28} />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-gray-900">{stats.total_clients}</p>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Client Base</p>
          </div>
          <Link href="/crm" className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all mt-6">
            Open CRM <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <MessageSquare size={28} />
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black text-gray-900">{stats.flagged_clients === 0 ? 'All Clear' : 'Active'}</p>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">AI Status</p>
          </div>
          <Link href="/settings" className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all mt-6">
            Assistant Settings <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Upcoming List */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Agenda */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-xl text-gray-900">Today's Agenda</h3>
                <span className="bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-tighter">
                  {stats.upcoming?.filter((a: any) => new Date(a.start_time).toDateString() === new Date().toDateString()).length || 0}
                </span>
              </div>
              <Link href="/calendar" className="text-blue-600 text-sm font-bold hover:underline bg-blue-50 px-4 py-1.5 rounded-full transition-colors">See full calendar</Link>
            </div>
            
            {stats.upcoming?.some((a: any) => new Date(a.start_time).toDateString() === new Date().toDateString()) ? (
              <div className="divide-y divide-gray-50">
                {stats.upcoming
                  .filter((apt: any) => new Date(apt.start_time).toDateString() === new Date().toDateString())
                  .map((apt: any) => {
                    const isPast = new Date(apt.start_time) < new Date();
                    const statusColors: any = {
                      scheduled: 'bg-blue-50 text-blue-600 border-blue-100',
                      confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                      cancelled: 'bg-red-50 text-red-600 border-red-100',
                      completed: 'bg-gray-50 text-gray-600 border-gray-100'
                    };
                    
                    return (
                      <div key={apt.id} className={`p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group ${isPast ? 'opacity-50 grayscale-[0.3]' : ''}`}>
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-blue-200 group-hover:text-blue-500 transition-all ${isPast ? 'grayscale' : ''}`}>
                            <UserIcon size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-lg text-gray-900 line-clamp-1">{apt.client?.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {apt.service && (
                                <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-blue-100">
                                  <Scissors size={10} /> {apt.service.name}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 font-medium italic truncate max-w-[150px]">
                                {apt.notes || 'No notes'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-sm border ${isPast ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-gray-900 text-white border-transparent'}`}>
                            <Clock size={14} className={isPast ? 'text-gray-400' : 'text-blue-400'} />
                            <span className="font-bold text-sm">
                              {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-end">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${statusColors[apt.status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                              {apt.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Clear Agenda</h4>
                <p className="text-gray-500 text-sm font-medium mt-1">No more appointments today.</p>
              </div>
            )}
          </div>

          {/* Coming Up */}
          {stats.upcoming?.some((a: any) => new Date(a.start_time).toDateString() !== new Date().toDateString()) && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900 px-2 flex items-center gap-2">
                <CalendarIcon size={18} className="text-gray-400" />
                Coming Up Next
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.upcoming
                  .filter((apt: any) => new Date(apt.start_time).toDateString() !== new Date().toDateString())
                  .slice(0, 4)
                  .map((apt: any) => (
                    <div key={apt.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <UserIcon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900 line-clamp-1">{apt.client?.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">
                            {new Date(apt.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Center */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-6">
            <h3 className="font-bold text-xl text-gray-900 border-b border-gray-50 pb-4">Assistant Hub</h3>
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-bold text-emerald-900">{business?.assistant_config?.name || 'Sherpa AI'}</span>
              </div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Online</span>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Greeting</p>
              <p className="text-sm text-gray-600 italic bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">
                "{business?.assistant_config?.greeting}"
              </p>
            </div>
            <Link href="/settings?tab=assistant" className="block text-center py-3 bg-gray-900 text-white hover:bg-gray-800 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95">
              Tune Behavior
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] shadow-xl p-8 text-white space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <MessageSquare size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="font-bold text-2xl tracking-tight">WhatsApp Business</h3>
              <p className="text-sm opacity-80 mt-3 leading-relaxed font-medium">
                Connect your official Business API to start automating bookings via WhatsApp.
              </p>
              <Link href="/settings?tab=integrations" className="block w-full mt-8 py-3 bg-white text-blue-700 rounded-2xl text-sm font-black text-center hover:bg-blue-50 transition-all shadow-xl active:scale-95">
                Enable Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
