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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Standard Public Routes
  if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding')) {
    return <>{children}</>;
  }

  // Sidebar should only show if we have a token
  // But the flex container should always be there to provide the base background/text styles
  const showSidebar = isClient && !!token;

  return (
    <div className="flex bg-gray-50 min-h-screen text-gray-900 w-full overflow-hidden">
      {showSidebar && <Sidebar />}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
