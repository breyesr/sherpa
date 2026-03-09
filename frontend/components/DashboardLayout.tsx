'use client';

import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !token && !pathname.startsWith('/auth')) {
      router.push('/auth/login');
    }
  }, [token, router, pathname, isHydrated]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse text-blue-600 font-bold text-xl">Sherpa</div>
      </div>
    );
  }

  if (!token && !pathname.startsWith('/auth')) {
    return null;
  }

  // If we are in auth or onboarding, don't show sidebar
  if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding')) {
    return <>{children}</>;
  }

  return (
    <div className="flex bg-gray-50 min-h-screen text-gray-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
