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
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
              <h3 className="font-bold text-xl text-gray-900">Today's Schedule</h3>
              <Link href="/calendar" className="text-blue-600 text-sm font-bold hover:underline bg-blue-50 px-4 py-1.5 rounded-full">See full calendar</Link>
            </div>
            
            {stats.upcoming?.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {stats.upcoming.map((apt: any) => (
                  <div key={apt.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-blue-200 group-hover:text-blue-500 transition-all">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-gray-900">{apt.client?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {apt.service && (
                            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              <Scissors size={10} /> {apt.service.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-medium italic truncate max-w-[200px]">
                            {apt.notes || 'No specific notes'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-gray-900 text-white px-4 py-2 rounded-xl inline-flex items-center gap-2 shadow-md">
                        <Clock size={14} className="text-blue-400" />
                        <span className="font-bold text-sm">
                          {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                        Confirmed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h4 className="text-xl font-bold text-gray-900">Your afternoon is open!</h4>
                <p className="text-gray-500 font-medium mt-2">No more appointments scheduled for today.</p>
                <Link href="/calendar" className="mt-8 inline-block text-blue-600 text-sm font-bold px-8 py-3 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-all">
                  Manual Booking
                </Link>
              </div>
            )}
          </div>
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
