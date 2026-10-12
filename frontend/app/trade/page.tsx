'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  MapPin, 
  Plus,
  ChevronRight,
  LayoutGrid,
  ClipboardList,
  Users
} from 'lucide-react';
import { useDrawerStore } from '@/lib/store/DrawerManager';
import { useTerminology } from '@/hooks/useTerminology';
import { components } from '@/types/api';
import { BrandCard, BrandButton, BrandBadge } from '@/components/ui/brand';

type StoreResponse = components['schemas']['StoreResponse'];
type CategoryResponse = components['schemas']['CategoryResponse'];
type ProductResponse = components['schemas']['ProductResponse'];

export default function TradeHubPage() {
  const token = useAuthStore((state) => state.token);
  const { t } = useTerminology();
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // Fetch Stores
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      return await apiClient.get<StoreResponse[]>('/trade/stores');
    },
    enabled: !!token,
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery<CategoryResponse[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        return await apiClient.get<CategoryResponse[]>('/trade/categories');
      } catch {
        return [];
      }
    },
    enabled: !!token,
  });

  // Fetch Products
  const { data: products = [] } = useQuery<ProductResponse[]>({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        return await apiClient.get<ProductResponse[]>('/trade/products');
      } catch {
        return [];
      }
    },
    enabled: !!token,
  });

  // Fetch Clients count
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>('/crm/clients');
      } catch {
        return [];
      }
    },
    enabled: !!token,
  });

  // Fetch Pending Orders count
  const { data: pendingOrders = [] } = useQuery<any[]>({
    queryKey: ['orders', 'pending-count'],
    queryFn: async () => {
      try {
        return await apiClient.get<any[]>('/trade/orders?status=pending');
      } catch {
        return [];
      }
    },
    enabled: !!token,
  });

  const stats = [
    { 
      name: `Total ${t('STORES', 'Accounts')}`, 
      value: stores.length.toString(), 
      icon: MapPin, 
      link: '/trade/entities/stores',
      badge: 'STORES'
    },
    { 
      name: `Active ${t('PRODUCTS', 'Products')}`, 
      value: products.length.toString(), 
      icon: Package, 
      link: '/trade/catalog/products',
      badge: 'SKUS'
    },
    { 
      name: `Pending ${t('ORDERS', 'Orders')}`, 
      value: pendingOrders.length.toString(), 
      icon: ShoppingCart, 
      link: '/trade/operations/orders?status=pending',
      badge: 'QUEUE'
    },
    { 
      name: `Trade ${t('RETAILERS', 'Clients')}`, 
      value: clients.length.toString(), 
      icon: Users, 
      link: '/trade/entities/retailers',
      badge: 'CLIENTS'
    },
  ];

  return (
    <div className="space-y-10 pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-deep tracking-tight">
              Trade Hub
            </h1>
            <BrandBadge variant="accent">PULSE</BrandBadge>
          </div>
          <p className="text-slate mt-1.5 font-medium text-base">
            Central nervous system for your field operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BrandButton 
            variant="primary"
            onClick={() => openDrawer('order')}
          >
            <ShoppingCart size={16} />
            {`New ${t('ORDER', 'Order')}`}
          </BrandButton>

          <BrandButton 
            variant="secondary"
            onClick={() => openDrawer('catalog', { initialMode: 'product' })}
          >
            <LayoutGrid size={16} />
            {`Manage Inventory`}
          </BrandButton>

          <BrandButton 
            variant="secondary"
            onClick={() => openDrawer('account')}
          >
            <Plus size={16} />
            {`Add ${t('STORE', 'Account')}`}
          </BrandButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link href={stat.link} key={stat.name} className="block group">
            <BrandCard hoverable className="p-6 h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="w-12 h-12 bg-ear/20 text-deep rounded-xl flex items-center justify-center group-hover:bg-ear/40 transition-colors">
                    <stat.icon size={22} />
                  </div>
                  <BrandBadge variant="neutral">
                    {stat.badge}
                  </BrandBadge>
                </div>
                <p className="text-3xl font-bold font-mono text-deep tracking-tight">{stat.value}</p>
                <p className="text-xs text-slate font-bold uppercase tracking-wider mt-1">{stat.name}</p>
              </div>
              <div className="flex items-center justify-end pt-4 mt-4 border-t border-utility text-xs font-semibold text-slate group-hover:text-deep transition-colors">
                <span>View Details</span>
                <ChevronRight size={16} className="ml-1 text-slate group-hover:text-deep transition-transform group-hover:translate-x-0.5" />
              </div>
            </BrandCard>
          </Link>
        ))}
      </div>

      {/* Main Grid: Observations & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity / Observations */}
        <div className="lg:col-span-2 space-y-8">
          <BrandCard className="p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-utility">
              <h3 className="font-bold text-xl text-deep flex items-center gap-2">
                <TrendingUp size={20} className="text-dark-accent" />
                Recent Observations
              </h3>
              <Link href="/trade/entities/stores">
                <BrandButton variant="ghost" size="sm">
                  {`View All ${t('STORES', 'Accounts')}`}
                </BrandButton>
              </Link>
            </div>

            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center text-slate mb-4 border border-utility">
                <ClipboardList size={30} />
              </div>
              <p className="text-slate font-medium max-w-sm mx-auto text-sm">
                No recent observations found. Notes and intelligence recorded during field visits will appear here.
              </p>
            </div>
          </BrandCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <BrandCard className="p-6">
              <h3 className="font-bold text-base text-deep mb-3 flex items-center gap-2">
                <Package size={18} className="text-slate" />
                Product Pulse
              </h3>
              <p className="text-slate text-sm font-medium">Detailed restock intelligence actively monitoring catalog velocity.</p>
            </BrandCard>
            <BrandCard className="p-6">
              <h3 className="font-bold text-base text-deep mb-3 flex items-center gap-2">
                <ShoppingCart size={18} className="text-slate" />
                Sales Velocity
              </h3>
              <p className="text-slate text-sm font-medium">Transactional ledger insights and order progression tracking active.</p>
            </BrandCard>
          </div>
        </div>

        {/* Categories Panel */}
        <div>
          <BrandCard className="p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-utility">
              <h3 className="font-bold text-xl text-deep">Categories</h3>
              <button 
                onClick={() => openDrawer('catalog', { initialMode: 'category' })}
                className="text-xs font-bold text-slate hover:text-deep uppercase tracking-widest transition-colors"
              >
                + Add New
              </button>
            </div>
            
            {categories.length > 0 ? (
              <div className="space-y-2.5">
                {categories.slice(0, 5).map((cat) => (
                  <div key={cat.id} className="p-3.5 bg-surface/80 rounded-xl border border-utility/50 flex items-center justify-between group hover:border-utility transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-canvas rounded-lg flex items-center justify-center text-slate border border-utility">
                        <LayoutGrid size={15} />
                      </div>
                      <span className="font-semibold text-sm text-deep">{cat.name}</span>
                    </div>
                  </div>
                ))}
                {categories.length > 5 && (
                  <p className="text-center text-[11px] font-mono text-slate pt-2">+{categories.length - 5} more categories</p>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate text-xs font-medium">No categories defined yet.</div>
            )}
            
            <div className="pt-4 border-t border-utility">
              <BrandButton 
                variant="secondary"
                size="md"
                className="w-full justify-center"
                onClick={() => openDrawer('catalog', { initialMode: 'product' })}
              >
                <Package size={16} />
                {`Add New ${t('PRODUCT', 'Product')}`}
              </BrandButton>
            </div>
          </BrandCard>
        </div>
      </div>
    </div>
  );
}
