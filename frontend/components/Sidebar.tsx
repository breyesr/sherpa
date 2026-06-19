'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  LogOut,
  Store,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  // Resilient queries with try/catch
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) return res.json();
      } catch {
        // Silent fail
      }
      return null;
    },
    enabled: !!token,
  });

  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await fetch(`${API_BASE_URL}/business/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) return res.json();
      } catch {
        // Silent fail
      }
      return { vertical_type: 'BASIC' };
    },
    enabled: !!token,
  });

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const isAdmin = user?.is_admin || user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="w-64 bg-white border-r min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-600">Sherpa</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <SidebarLink href="/" icon={LayoutDashboard} name="Dashboard" active={pathname === '/'} />
        <SidebarLink href="/conversations" icon={MessageSquare} name="Inbox" active={pathname === '/conversations'} />
        <SidebarLink href="/calendar" icon={Calendar} name="Calendar" active={pathname === '/calendar'} />
        
        {business?.vertical_type === 'TRADE' ? (
          <div className="space-y-1">
            <SidebarLink href="/trade" icon={Store} name="B2B Hub" active={pathname === '/trade'} />
            <div className="pl-9 space-y-1">
              <Link 
                href="/trade/stores"
                className={`block text-sm font-bold py-1.5 transition-all ${pathname.startsWith('/trade/stores') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                • Accounts
              </Link>
              <Link 
                href="/trade/retailers"
                className={`block text-sm font-bold py-1.5 transition-all ${pathname.startsWith('/trade/retailers') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                • Contacts
              </Link>
              <Link 
                href="/trade/products"
                className={`block text-sm font-bold py-1.5 transition-all ${pathname.startsWith('/trade/products') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                • Products
              </Link>
              <Link 
                href="/trade/orders"
                className={`block text-sm font-bold py-1.5 transition-all ${pathname.startsWith('/trade/orders') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                • Orders
              </Link>
              <Link 
                href="/trade/actions"
                className={`block text-sm font-bold py-1.5 transition-all ${pathname.startsWith('/trade/actions') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                • Actions
              </Link>
            </div>
          </div>
        ) : (
          <SidebarLink href="/crm" icon={Users} name="Clients" active={pathname === '/crm'} />
        )}

        <SidebarLink href="/settings" icon={Settings} name="Settings" active={pathname === '/settings'} />

        {isAdmin && (
          <SidebarLink href="/admin" icon={ShieldCheck} name="Admin Panel" active={pathname === '/admin'} />
        )}
      </nav>

      <div className="p-4 border-t mt-auto">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 w-full text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function SidebarLink({ href, icon: Icon, name, active }: any) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all font-bold ${
        active 
          ? 'bg-blue-50 text-blue-600 shadow-sm' 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon size={20} />
      <span>{name}</span>
    </Link>
  );
}
