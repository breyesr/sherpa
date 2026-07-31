'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
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
  const [isB2BHubOpen, setIsB2BHubOpen] = useState(true);
  const [isProductsCatalogOpen, setIsProductsCatalogOpen] = useState(false);

  // Resilient queries with try/catch
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      if (!token) return null;
      try {
        return await apiClient.get<any>('/auth/me');
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
        return await apiClient.get<any>('/business/me');
      } catch {
        // Silent fail
      }
      return { vertical_type: 'BASIC' };
    },
    enabled: !!token,
  });

  const handleLogout = async () => {
    await logout();
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
    sales_intelligence: { enabled: business?.vertical_type === 'TRADE' },
    services: { enabled: business?.vertical_type === 'BASIC' },
    products: { enabled: business?.vertical_type === 'TRADE' }
  };

  const showCRM = features.crm_suite?.enabled ?? false;
  const showCampaignFlow = features.campaign_flow?.enabled ?? false;
  const showB2BSolutions = features.b2b_solutions?.enabled ?? false;
  const showServices = features.services?.enabled ?? (business?.vertical_type === 'BASIC');
  const showSalesIntel = features.sales_intelligence?.enabled ?? (business?.vertical_type === 'TRADE');
  const showProducts = features.products?.enabled ?? (business?.vertical_type === 'TRADE');
  const showScheduling = showServices || showSalesIntel;

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
        
        {showCRM && !showCampaignFlow && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {/* CRM Operations Group */}
            <div className="space-y-1">
              <div className="px-4 py-1.5 text-slate-500 font-bold text-xs uppercase tracking-wider">
                CRM Operations
              </div>
              <SidebarLink href="/crm" icon={Users} name="Clients" active={pathname === '/crm'} />
              {showServices && (
                <SidebarLink href="/services" icon={Scissors} name="Services" active={pathname === '/services'} />
              )}
            </div>
          </div>
        )}

        {showB2BSolutions && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {/* B2B Hub Group */}
            <button 
              onClick={() => setIsB2BHubOpen(!isB2BHubOpen)}
              className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all text-sm font-semibold text-slate-600 hover:bg-slate-50/80 hover:text-slate-900`}
            >
              <div className="flex items-center gap-3">
                <Store size={20} />
                <span>B2B Hub</span>
              </div>
              <ChevronRight 
                size={14} 
                className={`transform transition-transform duration-200 text-slate-400 ${isB2BHubOpen ? 'rotate-90' : ''}`} 
              />
            </button>

            {isB2BHubOpen && (
              <div className="pl-9 space-y-1">
                <Link 
                  href="/trade/stores"
                  className={`block text-xs font-medium py-1.5 transition-all ${pathname.startsWith('/trade/stores') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Active Accounts
                </Link>
                <Link 
                  href="/trade/retailers"
                  className={`block text-xs font-medium py-1.5 transition-all ${pathname.startsWith('/trade/retailers') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Contacts
                </Link>
                <Link 
                  href="/trade/orders"
                  className={`block text-xs font-medium py-1.5 transition-all ${pathname.startsWith('/trade/orders') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Orders
                </Link>
                <Link 
                  href="/trade/actions"
                  className={`block text-xs font-medium py-1.5 transition-all ${pathname.startsWith('/trade/actions') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Actions
                </Link>
              </div>
            )}
          </div>
        )}

        {showCampaignFlow && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {/* Prospecting (Automated Intake & Campaigns) Group */}
            <div className="space-y-1">
              <button 
                onClick={() => setIsProspectingOpen(!isProspectingOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users size={16} />
                  <span>Prospecting</span>
                </div>
                <ChevronRight 
                  size={14} 
                  className={`transform transition-transform duration-200 ${isProspectingOpen ? 'rotate-90' : ''}`} 
                />
              </button>
              
              {isProspectingOpen && (
                <div className="pl-6 space-y-2">
                  {/* Wholesale Sub-tree */}
                  <div className="space-y-1">
                    <button 
                      onClick={() => setIsWholesaleOpen(!isWholesaleOpen)}
                      className="flex items-center justify-between w-full pl-3 pr-2 py-1 text-slate-500 font-bold text-xs hover:text-slate-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">Wholesale</span>
                      <ChevronRight 
                        size={12} 
                        className={`transform transition-transform duration-200 ${isWholesaleOpen ? 'rotate-90' : ''}`} 
                      />
                    </button>
                    {isWholesaleOpen && (
                      <div className="pl-6 space-y-1 border-l border-slate-100 ml-2">
                        <Link 
                          href="/trade/prospects/accounts?segment=wholesale"
                          className={`block text-xs font-medium py-1 transition-all ${pathname === '/trade/prospects/accounts' && (searchParams.get('segment') || 'wholesale') === 'wholesale' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Prospects
                        </Link>
                        <Link 
                          href="/trade/prospects/orders?segment=wholesale"
                          className={`block text-xs font-medium py-1 transition-all ${pathname === '/trade/prospects/orders' && (searchParams.get('segment') || 'wholesale') === 'wholesale' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Orders
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Retail Sub-tree */}
                  <div className="space-y-1">
                    <button 
                      onClick={() => setIsRetailOpen(!isRetailOpen)}
                      className="flex items-center justify-between w-full pl-3 pr-2 py-1 text-slate-500 font-bold text-xs hover:text-slate-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">Retail</span>
                      <ChevronRight 
                        size={12} 
                        className={`transform transition-transform duration-200 ${isRetailOpen ? 'rotate-90' : ''}`} 
                      />
                    </button>
                    {isRetailOpen && (
                      <div className="pl-6 space-y-1 border-l border-slate-100 ml-2">
                        <Link 
                          href="/trade/prospects/accounts?segment=retail"
                          className={`block text-xs font-medium py-1 transition-all ${pathname === '/trade/prospects/accounts' && searchParams.get('segment') === 'retail' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Prospects
                        </Link>
                        <Link 
                          href="/trade/prospects/orders?segment=retail"
                          className={`block text-xs font-medium py-1 transition-all ${pathname === '/trade/prospects/orders' && searchParams.get('segment') === 'retail' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Orders
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!showB2BSolutions && (
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <SidebarLink 
                  href="/trade/stores" 
                  icon={MapPin} 
                  name="Point of Sale" 
                  active={pathname.startsWith('/trade/stores')} 
                />
              </div>
            )}
          </div>
        )}

        {showProducts && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {/* Products Group */}
            <div className="space-y-1">
              <button 
                onClick={() => setIsProductsCatalogOpen(!isProductsCatalogOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package size={16} />
                  <span>Products Catalog</span>
                </div>
                <ChevronRight 
                  size={14} 
                  className={`transform transition-transform duration-200 ${isProductsCatalogOpen ? 'rotate-90' : ''}`} 
                />
              </button>

              {isProductsCatalogOpen && (
                <div className="pl-9 space-y-1">
                  <Link 
                    href="/trade/products?tab=categories"
                    className={`block text-xs font-medium py-1.5 transition-all ${pathname.startsWith('/trade/products') && activeTab === 'categories' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Categories
                  </Link>
                  <Link 
                    href="/trade/products?tab=products"
                    className={`block text-xs font-medium py-1.5 transition-all ${pathname.startsWith('/trade/products') && activeTab !== 'categories' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Products
                  </Link>
                </div>
              )}
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
      className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-semibold ${
        active 
          ? 'bg-blue-50/50 text-blue-600 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-md" />
      )}
      <Icon size={20} />
      <span>{name}</span>
    </Link>
  );
}
