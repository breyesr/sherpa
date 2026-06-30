'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  ShieldCheck,
  MapPin,
  Tag,
  Package,
  ArrowLeftRight,
  Scissors,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

import { Suspense, useState } from 'react';

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'products';
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const [isProspectingOpen, setIsProspectingOpen] = useState(true);
  const [isWholesaleOpen, setIsWholesaleOpen] = useState(true);
  const [isRetailOpen, setIsRetailOpen] = useState(true);

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

  // Features mapping with backward compatibility fallbacks
  const features = business?.features_config || {
    scheduling: { enabled: true },
    business_identity: { enabled: true },
    crm_suite: { enabled: business?.vertical_type === 'BASIC' },
    campaign_flow: { enabled: business?.vertical_type === 'TRADE' },
    b2b_solutions: { enabled: business?.vertical_type === 'TRADE' },
    sales_intelligence: { enabled: business?.vertical_type === 'TRADE' }
  };

  const showScheduling = features.scheduling?.enabled ?? true;
  const showCRM = features.crm_suite?.enabled ?? false;
  const showCampaignFlow = features.campaign_flow?.enabled ?? false;
  const showB2BSolutions = features.b2b_solutions?.enabled ?? false;

  return (
    <div className="w-64 bg-white border-r min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-600">Sherpa</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="space-y-1">
          <SidebarLink href="/" icon={LayoutDashboard} name="Dashboard" active={pathname === '/'} />
          <SidebarLink href="/conversations" icon={MessageSquare} name="Inbox" active={pathname === '/conversations'} />
          
          {showScheduling && (
            <SidebarLink href="/calendar" icon={Calendar} name="Calendar" active={pathname === '/calendar'} />
          )}
        </div>
        
        {showCRM && !showB2BSolutions && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <SidebarLink href="/crm" icon={Users} name="Clients" active={pathname === '/crm'} />
            <SidebarLink href="/services" icon={Scissors} name="Services" active={pathname === '/services'} />
            <div className="pl-9 space-y-1">
              <div className="flex items-center justify-between py-1.5 text-gray-300 cursor-not-allowed select-none">
                <span className="text-sm font-bold">• Category (pending)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-gray-300 cursor-not-allowed select-none">
                <span className="text-sm font-bold">• Products (pending)</span>
              </div>
            </div>
          </div>
        )}

        {showB2BSolutions && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {/* B2B Hub Group */}
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

            {/* Prospecting (Automated Intake & Campaigns) Group */}
            {showCampaignFlow && (
              <div className="space-y-1 pt-2 border-t border-gray-50">
                <button 
                  onClick={() => setIsProspectingOpen(!isProspectingOpen)}
                  className="flex items-center justify-between w-full px-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} />
                    <span>Prospecting</span>
                  </div>
                  {isProspectingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {isProspectingOpen && (
                  <div className="pl-6 space-y-2">
                    {/* Wholesale Sub-tree */}
                    <div className="space-y-1">
                      <button 
                        onClick={() => setIsWholesaleOpen(!isWholesaleOpen)}
                        className="flex items-center justify-between w-full pl-3 pr-2 py-1 text-gray-500 font-bold text-xs hover:text-gray-900 transition-colors"
                      >
                        <span className="flex items-center gap-2">• Wholesale</span>
                        {isWholesaleOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                      {isWholesaleOpen && (
                        <div className="pl-6 space-y-1 border-l border-gray-100 ml-2">
                          <Link 
                            href="/trade/prospects/accounts?segment=wholesale"
                            className={`block text-xs font-bold py-1 transition-all ${pathname === '/trade/prospects/accounts' && (searchParams.get('segment') || 'wholesale') === 'wholesale' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-900'}`}
                          >
                            Accounts
                          </Link>
                          <Link 
                            href="/trade/prospects/contacts?segment=wholesale"
                            className={`block text-xs font-bold py-1 transition-all ${pathname === '/trade/prospects/contacts' && (searchParams.get('segment') || 'wholesale') === 'wholesale' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-900'}`}
                          >
                            Contacts
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Retail Sub-tree */}
                    <div className="space-y-1">
                      <button 
                        onClick={() => setIsRetailOpen(!isRetailOpen)}
                        className="flex items-center justify-between w-full pl-3 pr-2 py-1 text-gray-500 font-bold text-xs hover:text-gray-900 transition-colors"
                      >
                        <span className="flex items-center gap-2">• Retail</span>
                        {isRetailOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                      {isRetailOpen && (
                        <div className="pl-6 space-y-1 border-l border-gray-100 ml-2">
                          <Link 
                            href="/trade/prospects/accounts?segment=retail"
                            className={`block text-xs font-bold py-1 transition-all ${pathname === '/trade/prospects/accounts' && searchParams.get('segment') === 'retail' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-900'}`}
                          >
                            Accounts
                          </Link>
                          <Link 
                            href="/trade/prospects/contacts?segment=retail"
                            className={`block text-xs font-bold py-1 transition-all ${pathname === '/trade/prospects/contacts' && searchParams.get('segment') === 'retail' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-900'}`}
                          >
                            Contacts
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!showB2BSolutions && showCampaignFlow && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <SidebarLink 
              href="/trade/stores" 
              icon={MapPin} 
              name="Point of Sale" 
              active={pathname.startsWith('/trade/stores')} 
            />
          </div>
        )}

        {(showB2BSolutions || showCampaignFlow) && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {/* Products Group */}
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                <Package size={16} />
                <span>Products</span>
              </div>
              <div className="pl-9 space-y-1">
                <Link 
                  href="/trade/products?tab=categories"
                  className={`block text-sm font-bold py-1.5 transition-all ${pathname.startsWith('/trade/products') && activeTab === 'categories' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  • Categories
                </Link>
                <Link 
                  href="/trade/products?tab=products"
                  className={`block text-sm font-bold py-1.5 transition-all ${pathname.startsWith('/trade/products') && activeTab !== 'categories' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  • Products
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <SidebarLink href="/settings" icon={Settings} name="Settings" active={pathname === '/settings'} />

          {isAdmin && (
            <SidebarLink href="/admin" icon={ShieldCheck} name="Admin Panel" active={pathname === '/admin'} />
          )}
        </div>
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

export default function Sidebar() {
  return (
    <Suspense fallback={<div className="w-64 bg-white border-r min-h-screen shrink-0" />}>
      <SidebarContent />
    </Suspense>
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
