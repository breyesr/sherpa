'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { 
  Home, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  LogOut,
  Store,
  MapPin,
  Tag,
  Package,
  Layers,
  X,
  LucideIcon
} from 'lucide-react';

type Workspace = 'B2B' | 'INBOUND';

function XerpaMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      aria-label="Xerpa listening network symbol"
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 22C21 14 29 11 37 13C47 15 53 24 51 34C50 41 45 46 39 49"
        stroke="var(--dark-accent)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M18 34C21 27 27 23 34 23C41 23 46 28 46 35C46 41 42 45 36 46"
        stroke="var(--field)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="14" cy="22" r="5" fill="var(--dark-accent)" />
      <circle cx="38" cy="50" r="5" fill="var(--dark-accent)" />
    </svg>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { theme, setTheme } = useThemeStore();

  const [workspace, setWorkspace] = useState<Workspace>('B2B');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const isB2B = workspace === 'B2B';
  const isTrailhead = theme === 'trailhead';

  // HIGH-CONTRAST ATMOSPHERIC BRAND GRADIENTS:
  // Trailhead:
  //   - B2B Ops: Dense Forest Pine (from #0C231E via #133930 to #1A4E42)
  //   - Inbound: Vivid Deep Teal / Ocean Cyan (from #09212A via #124B5A to #1A7086)
  // Block:
  //   - B2B Ops: Midnight Navy (from #081429 via #0F2347 to #16366D)
  //   - Inbound: Vivid Ultramarine / Royal Indigo (from #0B1133 via #1B266E to #2B3DA3)
  const workspaceGradient = isTrailhead
    ? (isB2B 
        ? 'from-[#0C231E] via-[#133930] to-[#1A4E42]' 
        : 'from-[#09212A] via-[#124B5A] to-[#1A7086]')
    : (isB2B 
        ? 'from-[#081429] via-[#0F2347] to-[#16366D]' 
        : 'from-[#0B1133] via-[#1B266E] to-[#2B3DA3]');

  // Luminous accent tokens for active pill, borders, badges and icons
  const activeAccentColor = isTrailhead
    ? (isB2B ? '#C9F04A' : '#5CE1E6') // Signal Lime vs Vivid Sky Cyan
    : (isB2B ? '#6F9BFF' : '#99B2FF'); // Clarity Cobalt vs Luminous Periwinkle

  const activePillBg = isTrailhead
    ? (isB2B ? '#C9F04A' : '#5CE1E6')
    : (isB2B ? '#6F9BFF' : '#99B2FF');

  const activePillText = isTrailhead
    ? (isB2B ? '#173D35' : '#09212A')
    : (isB2B ? '#081429' : '#0B1133');

  const statusBadgeText = isB2B ? 'Verified B2B' : 'Inbound Queue';

  return (
    <aside className="flex h-screen h-[100dvh] sticky top-0 shrink-0 text-white select-none z-30">
      {/* 1. THE MICRO-RAIL (Deep-2 Surface) */}
      <div 
        className="w-16 sm:w-[78px] border-r border-white/5 flex flex-col items-center py-3 sm:py-4 z-20 shadow-2xl transition-colors duration-500 h-full shrink-0 justify-between overflow-y-auto no-scrollbar"
        style={{ backgroundColor: 'var(--deep-2)' }}
      >
        <div className="w-full flex flex-col items-center">
          {/* Brand Mark Bubble */}
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-5 shadow-lg border border-white/10 transition-all duration-300 hover:scale-105 shrink-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
            title="Xerpa Field Intelligence"
          >
            <XerpaMark className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          
          {/* Global Navigation Links */}
          <nav className="flex flex-col gap-1.5 sm:gap-2 w-full px-1.5 sm:px-2">
            <RailLink href="/" icon={Home} active={pathname === '/'} label="Home" />
            <RailLink href="/conversations" icon={MessageSquare} active={pathname === '/conversations'} label="Inbox" />
            <RailLink href="/calendar" icon={Calendar} active={pathname === '/calendar'} label="Calendar" />
            <RailLink href="/trade/catalog/products?tab=products" icon={Tag} active={pathname.startsWith('/trade/catalog')} label="Catalog" />
            
            {/* Mobile/Tablet Workspace Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
              className={`w-full py-1.5 sm:py-2 flex flex-col items-center justify-center gap-0.5 sm:gap-1 rounded-xl transition-all lg:hidden ${
                isMobileDrawerOpen || pathname.startsWith('/trade')
                  ? 'bg-white/15 text-white font-bold shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
              title="Toggle Workspace Operations"
            >
              <Layers size={18} style={{ color: activeAccentColor }} />
              <span className="text-[9px] sm:text-[10px] font-bold">Ops</span>
            </button>
          </nav>
        </div>

        <div className="w-full flex flex-col items-center mt-auto">
          {/* Brand Palette Switcher on Micro-Rail */}
          <div className="w-full px-1.5 sm:px-2 my-2 sm:my-3">
            <div 
              className="flex flex-col gap-0.5 sm:gap-1 p-1 rounded-xl border border-white/10 bg-black/30"
              title="Switch Brand Color Palette"
            >
              <div className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-center py-0.5 opacity-60">
                Palette
              </div>
              <button
                type="button"
                onClick={() => setTheme('trailhead')}
                className={`text-[8px] sm:text-[9px] font-bold py-0.5 sm:py-1 px-1 rounded-lg transition-all text-center ${
                  isTrailhead 
                    ? 'bg-[#c9f04a] text-[#173d35] font-black shadow-sm' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Trail
              </button>
              <button
                type="button"
                onClick={() => setTheme('block')}
                className={`text-[8px] sm:text-[9px] font-bold py-0.5 sm:py-1 px-1 rounded-lg transition-all text-center ${
                  !isTrailhead 
                    ? 'bg-[#6f9bff] text-[#101f3d] font-black shadow-sm' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Block
              </button>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="flex flex-col gap-1 sm:gap-2 w-full px-1.5 sm:px-2">
            <RailLink href="/settings" icon={Settings} active={pathname === '/settings'} label="Settings" />
            <button 
              onClick={handleLogout}
              className="w-full py-1.5 sm:py-2.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 rounded-xl text-white/50 hover:text-rose-400 hover:bg-white/5 transition-colors group"
              title="Log Out"
            >
              <LogOut size={18} className="sm:w-5 sm:h-5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[9px] sm:text-[10px] font-bold">Log out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isMobileDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* 2. THE WORKSPACE SIDEBAR (Responsive Collapse: Hidden on < lg unless toggled as overlay) */}
      <div 
        className={`${
          isMobileDrawerOpen 
            ? 'fixed inset-y-0 left-16 sm:left-[78px] w-64 z-40 flex shadow-2xl animate-in slide-in-from-left duration-200' 
            : 'hidden lg:flex w-60 shrink-0'
        } flex-col border-r border-white/5 bg-gradient-to-b ${workspaceGradient} transition-all duration-700 ease-in-out relative`}
      >
        {/* Ambient Top Glow Wash */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none transition-all duration-700 opacity-20"
          style={{
            background: `radial-gradient(ellipse at top left, ${activeAccentColor}, transparent 70%)`
          }}
        />

        <div className="p-4 border-b border-white/10 relative z-10">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
              Workspace
            </span>
            <div className="flex items-center gap-1.5">
              <span 
                className="text-[9px] font-black px-2 py-0.5 rounded-full border transition-all duration-500 shadow-sm"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  borderColor: activeAccentColor,
                  color: activeAccentColor,
                  boxShadow: `0 0 10px ${activeAccentColor}20`
                }}
              >
                {statusBadgeText}
              </span>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="lg:hidden p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Close Drawer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          
          {/* SEGMENTED PILL */}
          <div className="flex bg-black/40 p-1 rounded-xl shadow-inner border border-white/10 relative overflow-hidden">
            <button 
              onClick={() => setWorkspace('B2B')}
              className="flex-1 text-xs font-bold py-2 rounded-lg transition-all duration-300 z-10"
              style={{
                backgroundColor: isB2B ? activePillBg : 'transparent',
                color: isB2B ? activePillText : 'rgba(255,255,255,0.65)',
                boxShadow: isB2B ? `0 2px 8px ${activePillBg}40` : 'none',
                fontWeight: isB2B ? 800 : 600
              }}
            >
              B2B Ops
            </button>
            <button 
              onClick={() => setWorkspace('INBOUND')}
              className="flex-1 text-xs font-bold py-2 rounded-lg transition-all duration-300 z-10"
              style={{
                backgroundColor: !isB2B ? activePillBg : 'transparent',
                color: !isB2B ? activePillText : 'rgba(255,255,255,0.65)',
                boxShadow: !isB2B ? `0 2px 8px ${activePillBg}40` : 'none',
                fontWeight: !isB2B ? 800 : 600
              }}
            >
              Inbound
            </button>
          </div>
        </div>
        
        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto relative z-10">
          {isB2B ? (
            <div className="space-y-1 animate-in fade-in slide-in-from-left-1 duration-300">
              <WorkspaceLink 
                href="/trade/entities/stores" 
                icon={Store} 
                name="Active Accounts" 
                active={pathname.startsWith('/trade/entities/stores')}
                accentColor={activeAccentColor}
                onClick={() => setIsMobileDrawerOpen(false)}
              />
              <WorkspaceLink 
                href="/trade/operations/orders" 
                icon={Package} 
                name="B2B Orders" 
                active={pathname.startsWith('/trade/operations/orders')} 
                accentColor={activeAccentColor}
                onClick={() => setIsMobileDrawerOpen(false)}
              />
              <WorkspaceLink 
                href="/trade/operations/actions" 
                icon={MapPin} 
                name="Field Actions" 
                active={pathname.startsWith('/trade/operations/actions')} 
                accentColor={activeAccentColor}
                onClick={() => setIsMobileDrawerOpen(false)}
              />
            </div>
          ) : (
            <div className="space-y-1 animate-in fade-in slide-in-from-right-1 duration-300">
              <WorkspaceLink 
                href="/trade/entities/prospects/accounts?segment=wholesale" 
                icon={Users} 
                name="Prospects" 
                active={pathname.includes('prospects/accounts')} 
                accentColor={activeAccentColor}
                onClick={() => setIsMobileDrawerOpen(false)}
              />
              <WorkspaceLink 
                href="/trade/entities/prospects/orders?segment=wholesale" 
                icon={Package} 
                name="Pending Orders" 
                active={pathname.includes('prospects/orders')} 
                accentColor={activeAccentColor}
                onClick={() => setIsMobileDrawerOpen(false)}
              />
            </div>
          )}
        </nav>

        {/* Digital Brain State Indicator Footer */}
        <div className="p-3 border-t border-white/10 text-[11px] text-white/60 flex items-center justify-between transition-colors duration-500 relative z-10">
          <span className="font-medium">{isB2B ? 'Digital Brain · B2B' : 'Digital Brain · Inbound'}</span>
          <span 
            className="w-2.5 h-2.5 rounded-full transition-all duration-500 shadow-sm"
            style={{ 
              backgroundColor: activeAccentColor,
              boxShadow: `0 0 10px ${activeAccentColor}`
            }}
          />
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={<div className="w-16 sm:w-[78px] lg:w-[318px] h-screen h-[100dvh] shrink-0" style={{ backgroundColor: '#102d27' }} />}>
      <SidebarContent />
    </Suspense>
  );
}

function RailLink({ href, icon: Icon, active, label }: { href: string; icon: LucideIcon; active: boolean; label: string }) {
  return (
    <Link 
      href={href}
      className="w-full py-2 sm:py-2.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 rounded-xl transition-all group border"
      style={{
        backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        borderColor: active ? 'var(--dark-accent)' : 'transparent',
        color: active ? 'var(--dark-accent)' : 'rgba(255,255,255,0.6)',
      }}
    >
      <Icon size={18} className={`sm:w-5 sm:h-5 ${active ? '' : 'group-hover:-translate-y-0.5 transition-transform'}`} />
      <span className="text-[9px] sm:text-[10px] font-bold">{label}</span>
    </Link>
  );
}

function WorkspaceLink({ 
  href, 
  icon: Icon, 
  name, 
  active,
  accentColor,
  onClick
}: { 
  href: string; 
  icon: LucideIcon; 
  name: string; 
  active: boolean;
  accentColor: string;
  onClick?: () => void;
}) {
  return (
    <Link 
      href={href}
      onClick={onClick}
      className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold border"
      style={{
        backgroundColor: active ? 'rgba(255,255,255,0.14)' : 'transparent',
        borderColor: active ? accentColor : 'transparent',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.7)',
        boxShadow: active ? `0 0 16px -2px ${accentColor}35` : 'none',
      }}
    >
      <Icon 
        size={18} 
        style={{ color: active ? accentColor : 'rgba(255,255,255,0.5)' }} 
      />
      <span>{name}</span>
    </Link>
  );
}
