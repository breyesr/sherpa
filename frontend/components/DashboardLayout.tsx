'use client';

import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('DashboardLayout: Mounted, token state:', token ? 'Exists' : 'Empty');
    setMounted(true);
  }, [token]);

  // If we are in auth or onboarding, don't show sidebar
  if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding')) {
    return <>{children}</>;
  }

  // Only show sidebar if we are mounted and have a token
  const showSidebar = mounted && !!token;
  
  console.log('DashboardLayout: Render, showSidebar:', showSidebar, 'pathname:', pathname);

  return (
    <div className="flex bg-gray-50 min-h-screen text-gray-900">
      {showSidebar && <Sidebar />}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
