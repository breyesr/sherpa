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

  console.log('Sidebar: Rendering, token exists?', !!token);

  // Fetch current user and business with very safe fallbacks
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return res.json();
      } catch (e) { return null; }
    },
    enabled: !!token,
    retry: 1
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
        return { vertical_type: 'BASIC' };
      } catch (err) {
        return { vertical_type: 'BASIC' };
      }
    },
    enabled: !!token,
    staleTime: 60 * 1000,
    retry: 1
  });

  const handleLogout = () => {
    console.log('Sidebar: Handling logout');
    logout();
    router.push('/auth/login');
  };

  // Base Menu (Always visible if token exists)
  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inbox', href: '/conversations', icon: MessageSquare },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Clients', href: '/crm', icon: Users },
  ];

  // Conditional Items (Safely added)
  if (business?.vertical_type === 'TRADE') {
    menuItems.push({ name: 'Trade Hub', href: '/trade', icon: Store });
  }

  menuItems.push({ name: 'Settings', href: '/settings', icon: Settings });

  const isAdmin = user?.is_admin || user?.role === 'admin' || user?.role === 'super_admin';
  if (isAdmin) {
    menuItems.push({ name: 'Admin Panel', href: '/admin', icon: ShieldCheck });
  }

  return (
    <div className="w-64 bg-white border-r min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-600">Sherpa</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 w-full text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
