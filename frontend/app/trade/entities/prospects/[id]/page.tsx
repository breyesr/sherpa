'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  Store as StoreIcon, 
  MapPin, 
  Phone, 
  Mail, 
  ChevronLeft,
  FileText,
  ShoppingBag,
  Package,
  TrendingUp,
  Target,
  Trash2,
  Users,
  CheckCircle
} from 'lucide-react';
import { components } from '@/types/api';
import { BrandCard, BrandButton, BrandBadge } from '@/components/ui/brand';

type StoreResponse = components['schemas']['StoreResponse'];
type OrderResponse = components['schemas']['OrderResponse'];
type ProductResponse = components['schemas']['ProductResponse'];

type TabType = 'details' | 'products' | 'orders';

export default function ProspectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch Store Detail
  const { data: store, isLoading } = useQuery<StoreResponse>({
    queryKey: ['store', id],
    queryFn: async () => {
      return await apiClient.get<StoreResponse>(`/trade/stores/${id}`);
    },
    enabled: !!token && !!id,
  });

  // Fetch Store Orders
  const { data: allOrders = [] } = useQuery<OrderResponse[]>({
    queryKey: ['orders', store?.prospect_segment],
    queryFn: async () => {
      try {
        return await apiClient.get<OrderResponse[]>(`/trade/prospects/orders?segment=${store?.prospect_segment || ''}`);
      } catch {
        return [];
      }
    },
    enabled: !!token && !!store?.prospect_segment,
  });

  const orders = allOrders.filter((o) => o.store_id === id);

  // Fetch Products (Global catalog)
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

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // 1. Verify store
      await apiClient.patch<void>(`/trade/stores/${id}`, { is_verified: true });

      // 2. Verify all unverified orders in parallel
      const unverifiedOrders = orders.filter(o => !o.is_verified);
      await Promise.all(
        unverifiedOrders.map(async (order) => {
          try {
            await apiClient.patch<void>(`/trade/orders/${order.id}`, { is_verified: true });
          } catch (orderErr) {
            console.error(`Failed to verify order ${order.id}`, orderErr);
          }
        })
      );

      // 3. Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['store', id] });
      await queryClient.invalidateQueries({ queryKey: ['orders', store?.prospect_segment] });
      await queryClient.invalidateQueries({ queryKey: ['prospect-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['stores'] });

    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred while verifying');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading || !token) return <div className="p-20 text-center font-bold text-slate">Loading Prospect Intelligence...</div>;
  if (!store) return <div className="p-20 text-center font-bold text-alert">Prospect not found or connection error.</div>;

  const isSystemGenerated = store.name.toLowerCase().startsWith('prospect');
  const clientName = store.clients?.[0]?.name;
  const displayTitle = (isSystemGenerated && clientName ? clientName : store.name)
    .replace(/^prospect\s+/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();

  const totalOrderValue = orders.reduce((sum, order) => sum + order.total_amount, 0);

  // Group products bought by product_id
  const boughtProductsMap = new Map<string, number>();
  for (const order of orders) {
    if (order.items) {
      for (const item of order.items) {
        if (item.product_id) {
          const currentQty = boughtProductsMap.get(item.product_id) || 0;
          boughtProductsMap.set(item.product_id, currentQty + (item.quantity || 0));
        }
      }
    }
  }

  const boughtProducts = Array.from(boughtProductsMap.entries()).map(([productId, quantity]) => {
    const catalogProduct = products.find((p) => p.id === productId);
    return {
      id: productId,
      quantity,
      name: catalogProduct?.name || 'Unknown Product',
      sku: catalogProduct?.sku || 'No SKU',
      price: catalogProduct?.price ?? 0,
      unit_of_measure: catalogProduct?.unit_of_measure || 'unit'
    };
  });

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
  ];

  return (
    <div id="v2-prospect-detail-container" className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Link
          href={store.prospect_segment === 'retail' ? '/trade/entities/prospects/accounts?segment=retail' : '/trade/entities/prospects/accounts?segment=wholesale'}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate hover:text-deep transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Prospects
        </Link>
        <div className="flex items-center gap-3">
          {!store.is_verified && (
            <BrandButton
              onClick={handleVerify}
              disabled={isVerifying}
              size="sm"
            >
              <CheckCircle size={15} className="mr-1.5" />
              {isVerifying ? 'Verifying...' : 'Verify Prospect & Orders'}
            </BrandButton>
          )}
          <button
            onClick={async () => {
              if (confirm(`Are you sure you want to delete prospect account ${store.name}?`)) {
                try {
                  const clientId = store.clients?.[0]?.id;
                  await apiClient.delete<void>(`/trade/stores/${store.id}`);
                  if (clientId) {
                    try {
                      await apiClient.delete<void>(`/crm/clients/${clientId}`);
                    } catch (clientErr) {
                      console.error('Error deleting client contact:', clientErr);
                    }
                  }
                  router.push(store.prospect_segment === 'retail' ? '/trade/entities/prospects/accounts?segment=retail' : '/trade/entities/prospects/accounts?segment=wholesale');
                } catch {
                  alert('Failed to delete prospect account');
                }
              }
            }}
            className="flex items-center gap-2 text-alert hover:bg-alert/10 font-bold transition-all px-3.5 py-2 rounded-xl text-xs border border-alert/20"
          >
            <Trash2 size={14} />
            Delete Prospect Account
          </button>
        </div>
      </div>

      {/* Header Card */}
      <BrandCard className="p-8 md:p-10 relative overflow-hidden">
        <div className="relative flex flex-col lg:flex-row justify-between gap-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-20 h-20 bg-ear/20 text-deep rounded-2xl flex items-center justify-center border border-utility shadow-sm shrink-0">
              <StoreIcon size={36} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <BrandBadge variant={store.is_verified ? 'confirmed' : 'pending'}>
                  {store.is_verified ? 'Verified Prospect' : 'Unverified Prospect'}
                </BrandBadge>
                <BrandBadge variant="neutral">
                  {store.segment || 'General'}
                </BrandBadge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-deep tracking-tight mb-3">
                {displayTitle}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center gap-5 text-slate text-sm font-medium">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-slate" />
                  <span>{store.address || 'No address registered'}</span>
                </div>
                {store.region && (
                  <div className="flex items-center gap-2 font-mono">
                    <Target size={15} className="text-dark-accent" />
                    <span>Region: {store.region}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:flex gap-4 items-center flex-wrap">
            <div className="bg-surface p-5 rounded-2xl border border-utility min-w-[140px]">
              <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Total Value</span>
              <span className="text-2xl font-bold font-mono text-deep">${totalOrderValue.toLocaleString()}</span>
              <div className="flex items-center gap-1 text-confirmed text-[10px] font-bold mt-1 uppercase">
                <TrendingUp size={12} /> {orders.length} Orders
              </div>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-utility min-w-[140px]">
              <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Avg. Ticket</span>
              <span className="text-2xl font-bold font-mono text-deep">
                ${orders.length > 0 ? (totalOrderValue / orders.length).toFixed(0) : '0'}
              </span>
              <div className="flex items-center gap-1 text-dark-accent text-[10px] font-bold mt-1 uppercase">
                <ShoppingBag size={12} /> Per Order
              </div>
            </div>
          </div>
        </div>
      </BrandCard>

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="bg-surface p-1.5 rounded-2xl border border-utility flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-canvas text-deep shadow-sm border border-utility' 
                  : 'text-slate hover:text-deep hover:bg-canvas/50'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <BrandCard className="p-8 min-h-[460px]">
          {activeTab === 'details' && (
            <div className="space-y-10">
              <section>
                <h3 className="text-lg font-bold text-deep mb-6 flex items-center gap-2">
                  <FileText size={18} className="text-dark-accent" />
                  General Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InfoItem label="Full Name" value={store.clients?.[0]?.name || 'No Contact'} icon={Users} />
                  <InfoItem label="Physical Address" value={store.address || 'Not specified'} icon={MapPin} />
                  <InfoItem label="Phone Number" value={store.clients?.[0]?.phone || store.phone || 'Not available'} icon={Phone} />
                  <InfoItem label="Email Address" value={store.clients?.[0]?.email || store.email || 'Not available'} icon={Mail} />
                </div>
              </section>

              <section className="pt-8 border-t border-utility">
                <h3 className="text-lg font-bold text-deep mb-6 flex items-center gap-2">
                  <Target size={18} className="text-dark-accent" />
                  Market Context
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-surface p-5 rounded-2xl border border-utility">
                    <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Market</span>
                    <span className="font-bold text-deep text-base">Unassigned</span>
                  </div>
                  <div className="bg-surface p-5 rounded-2xl border border-utility">
                    <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Segment</span>
                    <span className="font-bold text-deep text-base">{store.segment || 'General'}</span>
                  </div>
                  <div className="bg-surface p-5 rounded-2xl border border-utility">
                    <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-1">Region</span>
                    <span className="font-bold text-deep text-base">{store.region || 'Unknown'}</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-deep mb-4">Product Portfolio</h3>
              {boughtProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {boughtProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/trade/catalog/products/${product.id}`}
                      className="p-4 bg-surface rounded-2xl border border-utility flex items-center justify-between group hover:border-utility/80 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-canvas rounded-xl flex items-center justify-center text-slate border border-utility shadow-sm group-hover:text-deep transition-all">
                          <Package size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-deep group-hover:text-dark-accent transition-colors">{product.name}</p>
                          <p className="text-xs text-slate font-mono uppercase">{product.sku || 'No SKU'}</p>
                          <p className="text-xs text-dark-accent font-semibold mt-0.5">
                            Bought: {product.quantity} {product.unit_of_measure}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-deep">${(product.price).toFixed(2)}</p>
                        <p className="text-[10px] text-slate font-bold uppercase">{product.unit_of_measure || 'unit'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="text-slate mb-3" size={28} />
                  <p className="text-slate text-sm font-semibold">No products purchased yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-deep mb-4">Order History</h3>
              {orders.length > 0 ? (
                <div className="divide-y divide-utility">
                  {orders.map((order) => (
                    <Link 
                      key={order.id} 
                      href={`/trade/operations/orders/${order.id}`}
                      className="py-5 flex items-center justify-between group hover:bg-surface/50 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-surface rounded-xl flex items-center justify-center text-slate border border-utility group-hover:text-dark-accent transition-all">
                          <ShoppingBag size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-deep font-mono text-sm group-hover:text-dark-accent transition-colors">Order #{order.id.slice(0, 8)}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <p className="text-xs text-slate font-mono uppercase">
                              {new Date(order.created_at).toLocaleDateString()} • {order.status}
                            </p>
                            {!order.is_verified && (
                              <BrandBadge variant="pending">
                                Unverified Order
                              </BrandBadge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-deep text-base">${order.total_amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate font-bold uppercase">{(order.items || []).length} items</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShoppingBag className="text-slate mb-3" size={28} />
                  <p className="text-slate text-sm font-semibold">No orders recorded for this account.</p>
                </div>
              )}
            </div>
          )}
        </BrandCard>
      </div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string | number | null;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
}

function InfoItem({ label, value, icon: Icon }: InfoItemProps) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 bg-canvas rounded-xl flex items-center justify-center text-slate border border-utility shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-0.5">{label}</span>
        <span className="font-bold text-deep">{value}</span>
      </div>
    </div>
  );
}
