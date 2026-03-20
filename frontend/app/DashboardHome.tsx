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
  User as UserIcon
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
      return res.json();
    },
    initialData: initialStats,
    staleTime: 30 * 1000,
  });

  return (
    <div className="space-y-8">
      {/* Onboarding Banner */}
      {!business && (
        <div className="bg-blue-600 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
          <div>
            <h2 className="text-xl font-bold">Complete your setup! 🚀</h2>
            <p className="opacity-90">You haven't finished setting up your business profile and assistant.</p>
          </div>
          <Link 
            href="/onboarding"
            className="px-6 py-2 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            Go to Onboarding
          </Link>
        </div>
      )}

      {/* Header Summary */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Good afternoon, {business?.name || 'there'}
            {isFetchingStats && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your appointments today.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors">
            <Bell size={16} />
            Notifications
          </button>
          <Link href="/calendar" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
            <PlusCircle size={16} />
            Quick Book
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <CalendarIcon size={24} />
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.today_appointments}</p>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Today's Appointments</p>
          </div>
          <Link href="/calendar" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline mt-2">
            View calendar <ChevronRight size={14} />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.total_clients}</p>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Clients</p>
          </div>
          <Link href="/crm" className="text-green-600 text-sm font-bold flex items-center gap-1 hover:underline mt-2">
            Manage clients <ChevronRight size={14} />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.total_appointments}</p>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Bookings</p>
          </div>
          <Link href="/conversations" className="text-purple-600 text-sm font-bold flex items-center gap-1 hover:underline mt-2">
            View inbox <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg">Upcoming Appointments</h3>
              <Link href="/calendar" className="text-blue-600 text-sm font-bold hover:underline">See all</Link>
            </div>
            
            {stats.upcoming?.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {stats.upcoming.map((apt: any) => (
                  <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{apt.client?.name}</p>
                        <p className="text-xs text-gray-500 font-medium">{apt.notes || 'No notes'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 flex items-center gap-2 justify-end">
                        <Clock size={14} className="text-blue-500" />
                        {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-400 font-medium uppercase">
                        {new Date(apt.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <CalendarIcon size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">No appointments scheduled for today.</p>
                <Link href="/calendar" className="mt-4 inline-block text-blue-600 text-sm font-bold px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  Schedule a manual booking
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Assistant Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg border-b pb-4">Assistant Status</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium">{business?.assistant_config?.name || 'Assistant'}</span>
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">ACTIVE</span>
            </div>
            <p className="text-sm text-gray-500 italic">
              "{business?.assistant_config?.greeting}"
            </p>
            <Link href="/settings" className="block text-center py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-bold transition-colors">
              Edit Settings
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-md p-6 text-white space-y-4">
            <h3 className="font-bold text-lg">WhatsApp Status</h3>
            <p className="text-sm opacity-90 leading-relaxed">
              Your WhatsApp Business API is not connected. Connect it now to start automating your bookings.
            </p>
            <Link href="/settings" className="block w-full py-2 bg-white text-blue-600 rounded-lg text-sm font-bold text-center hover:bg-blue-50 transition-colors">
              Setup Integration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
