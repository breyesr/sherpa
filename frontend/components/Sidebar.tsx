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
      } catch (e) {}
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
      } catch (e) {}
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
        <SidebarLink href="/crm" icon={Users} name="Clients" active={pathname === '/crm'} />
        
        {business?.vertical_type === 'TRADE' && (
          <SidebarLink href="/trade" icon={Store} name="Trade Hub" active={pathname.startsWith('/trade')} />
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
