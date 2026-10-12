'use client';

import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

function getClientCookieToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)sherpa_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  initialToken?: string | null;
}

export default function DashboardLayout({
  children,
  initialToken = null,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const { theme, setTheme } = useThemeStore();
  const [isClient, setIsClient] = useState(false);
  const [cookieToken, setCookieToken] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const resolvedCookie = getClientCookieToken();
    if (resolvedCookie) {
      setCookieToken(resolvedCookie);
      if (!useAuthStore.getState().token) {
        useAuthStore.setState({ token: resolvedCookie });
      }
    } else if (initialToken) {
      setCookieToken(initialToken);
      if (!useAuthStore.getState().token) {
        useAuthStore.setState({ token: initialToken });
      }
    }
  }, [initialToken]);

  // Sync data-theme attribute with document root for full cascading
  useEffect(() => {
    if (isClient) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [isClient, theme]);

  const activeToken = token || initialToken || cookieToken;

  // Fallback hydration from /api/auth if client state is empty
  useEffect(() => {
    if (isClient && !activeToken) {
      fetch('/api/auth')
        .then((res) => res.json())
        .then((data) => {
          if (data?.token) {
            setCookieToken(data.token);
            if (!useAuthStore.getState().token) {
              useAuthStore.setState({ token: data.token });
            }
          }
        })
        .catch((err) => {
          console.error('Failed to hydrate token from cookie:', err);
        });
    }
  }, [isClient, activeToken]);

  const isPublicRoute =
    pathname.startsWith('/auth') ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    (pathname === '/' && !activeToken);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const showSidebar = isClient;
  const isTrailhead = theme === 'trailhead';

  return (
    <div 
      data-theme={theme}
      className="flex h-screen h-[100dvh] w-full overflow-hidden transition-colors duration-500"
      style={{ 
        backgroundColor: 'var(--field)', 
        color: 'var(--deep)' 
      }}
    >
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Floating Brand Palette Switcher */}
        <header 
            className="h-14 px-3 sm:px-6 lg:px-8 border-b flex items-center justify-between shrink-0 transition-colors duration-500 z-10"
            style={{ 
              borderColor: 'var(--utility)',
              backgroundColor: 'var(--field)'
            }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold" style={{ color: 'var(--slate)' }}>
              <span className="hidden sm:inline">Palette:</span>
              <strong style={{ color: 'var(--deep)' }} className="text-xs truncate max-w-[120px] sm:max-w-none">
                {isTrailhead ? 'Trailhead × Spectrum' : 'Block × Clarity'}
              </strong>
            </div>

            {/* Persistent Switcher Controls */}
            <div 
              className="flex items-center p-1 rounded-xl border shadow-sm transition-all"
              style={{ 
                borderColor: 'var(--utility)', 
                backgroundColor: 'rgba(255, 255, 255, 0.7)' 
              }}
            >
              <button
                type="button"
                onClick={() => setTheme('trailhead')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all"
                style={{
                  backgroundColor: isTrailhead ? 'var(--deep)' : 'transparent',
                  color: isTrailhead ? 'var(--dark-accent)' : 'var(--slate)',
                  boxShadow: isTrailhead ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: '#c9f04a' }}
                />
                Trailhead
              </button>
              
              <button
                type="button"
                onClick={() => setTheme('block')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all"
                style={{
                  backgroundColor: !isTrailhead ? 'var(--deep)' : 'transparent',
                  color: !isTrailhead ? 'var(--dark-accent)' : 'var(--slate)',
                  boxShadow: !isTrailhead ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: '#6f9bff' }}
                />
                Block
              </button>
            </div>
          </header>

        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
