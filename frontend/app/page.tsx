'use client';

import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/config';
import { 
  Users, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  ChevronRight,
  PlusCircle,
  Bell
} from 'lucide-react';

export default function Home() {
  const { token, logout } = useAuthStore();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkBusiness() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/business/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.status === 404) {
          router.push('/onboarding');
        } else if (res.ok) {
          const data = await res.json();
          setBusiness(data);
        }
      } catch (err) {
        console.error('Failed to fetch business', err);
      } finally {
        setLoading(false);
      }
    }

    checkBusiness();
  }, [token, router]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-xl animate-pulse text-blue-600 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
        <div className="max-w-2xl w-full text-center space-y-8 bg-white p-12 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-6xl font-extrabold text-blue-600 tracking-tight">Sherpa</h1>
          <p className="text-2xl text-gray-500 font-medium italic">"Scheduling made simple."</p>
          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/login" 
              className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-lg"
            >
              Login
            </Link>
            <Link 
              href="/auth/register" 
              className="px-10 py-4 border-2 border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all active:scale-95 text-lg"
            >
              Try for Free
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Good afternoon, {business?.name}</h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your appointments today.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors">
            <Bell size={16} />
            Notifications
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
            <PlusCircle size={16} />
            Quick Book
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <CalendarIcon size={24} />
          </div>
          <div>
            <p className="text-3xl font-bold">0</p>
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
            <p className="text-3xl font-bold">0</p>
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
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">AI Conversations</p>
          </div>
          <Link href="/conversations" className="text-purple-600 text-sm font-bold flex items-center gap-1 hover:underline mt-2">
            View inbox <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Upcoming Appointments</h3>
              <button className="text-blue-600 text-sm font-bold hover:underline">See all</button>
            </div>
            <div className="p-12 text-center">
              <CalendarIcon size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">No appointments scheduled for today.</p>
              <button className="mt-4 text-blue-600 text-sm font-bold px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                Schedule a manual booking
              </button>
            </div>
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
            <button className="w-full py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
              Setup Integration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
