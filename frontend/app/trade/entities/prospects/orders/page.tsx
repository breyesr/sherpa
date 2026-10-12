'use client';

import { useState, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  Package, 
  Search, 
  ChevronRight, 
  MapPin, 
  User as UserIcon, 
  DollarSign, 
  ClipboardList, 
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { components } from '@/types/api';
import { BrandBadge, BrandButton, BrandCard } from '@/components/ui/brand';

type OrderResponse = components['schemas']['OrderResponse'];
type StoreResponse = components['schemas']['StoreResponse'];
type ProductResponse = components['schemas']['ProductResponse'];

function ProspectOrdersContent() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const segment = searchParams.get('segment') || 'wholesale';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch Prospect Orders
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<OrderResponse[]>({
    queryKey: ['prospect-orders', segment],
    queryFn: async () => {
      return await apiClient.get<OrderResponse[]>(`/trade/prospects/orders?segment=${segment}`);
    },
    enabled: !!token,
  });

  // Fetch Prospect Stores to map store names
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores', { is_prospect: true, segment }],
    queryFn: async () => {
      try {
        return await apiClient.get<StoreResponse[]>(`/trade/stores?is_prospect=true&prospect_segment=${segment}`);
      } catch {
        return [];
      }
    },
    enabled: !!token,
  });

  // Fetch Products to map product names in items
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

  // Store lookup map
  const storeMap = useMemo(() => {
    const map: Record<string, StoreResponse> = {};
    stores.forEach((store) => {
      map[store.id] = store;
    });
    return map;
  }, [stores]);

  // Product lookup map
  const productMap = useMemo(() => {
    const map: Record<string, ProductResponse> = {};
    products.forEach((prod) => {
      map[prod.id] = prod;
    });
    return map;
  }, [products]);

  // Verify Order mutation (Quick verify button)
  const verifyMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiClient.patch<void>(`/trade/orders/${orderId}`, { is_verified: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-orders', segment] });
    }
  });

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const store = storeMap[order.store_id];
      const storeName = store ? store.name.toLowerCase() : '';
      const clientName = store?.clients && store.clients.length > 0 ? store.clients[0].name.toLowerCase() : '';
      const notes = order.notes ? order.notes.toLowerCase() : '';
      const orderId = order.id.toLowerCase();

      // Search matching store, client, ID, or notes
      const matchesSearch = 
        storeName.includes(searchTerm.toLowerCase()) ||
        clientName.includes(searchTerm.toLowerCase()) ||
        orderId.includes(searchTerm.toLowerCase()) ||
        notes.includes(searchTerm.toLowerCase());

      const orderStatus = (order.status || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'unverified' && !order.is_verified) ||
        (statusFilter === 'verified' && order.is_verified) ||
        orderStatus === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter, storeMap]);

  // Stats Counters
  const stats = useMemo(() => {
    let pendingCount = 0;
    let unverifiedCount = 0;
    let totalPotentialValue = 0;

    orders.forEach((order) => {
      if (order.status === 'pending') {
        pendingCount++;
      }
      if (!order.is_verified) {
        unverifiedCount++;
      }
      totalPotentialValue += order.total_amount || 0;
    });

    return { pendingCount, unverifiedCount, totalPotentialValue };
  }, [orders]);

  if (isLoadingOrders) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-deep border-t-transparent"></div>
      </div>
    );
  }

  const isWholesale = segment === 'wholesale';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BrandBadge variant="ear" className="text-[10px] uppercase tracking-widest font-black font-mono">
            Inbound Intake · {segment.toUpperCase()}
          </BrandBadge>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-deep tracking-tight capitalize">
          {isWholesale ? 'Wholesale Lead Orders' : 'Retail Referral Orders'}
        </h1>
        <p className="text-slate mt-2 font-medium text-base md:text-lg max-w-3xl">
          {isWholesale 
            ? 'Incoming wholesale order requests automatically qualified from WhatsApp/Telegram campaigns.' 
            : 'Order requests submitted by retail store referrals.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BrandCard className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-slate/60 text-xs font-bold uppercase tracking-wider">Potential Volume</p>
            <p className="text-3xl font-black text-deep font-mono">
              ${stats.totalPotentialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            <DollarSign size={22} />
          </div>
        </BrandCard>

        <BrandCard className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-slate/60 text-xs font-bold uppercase tracking-wider">Unverified Drafts</p>
            <p className="text-3xl font-black text-deep font-mono">{stats.unverifiedCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
            <Clock size={22} />
          </div>
        </BrandCard>

        <BrandCard className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-slate/60 text-xs font-bold uppercase tracking-wider">Total Qualified</p>
            <p className="text-3xl font-black text-deep font-mono">{orders.length}</p>
          </div>
          <div className="p-3 bg-deep/5 text-deep rounded-xl border border-utility">
            <ClipboardList size={22} />
          </div>
        </BrandCard>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-utility shadow-brand-subtle">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/50" size={18} />
          <input 
            type="text"
            placeholder="Search orders, stores, contacts..."
            className="w-full pl-12 pr-4 py-2.5 bg-black/[0.02] border border-utility rounded-xl focus:border-deep focus:ring-2 focus:ring-deep/10 outline-none transition-all font-medium text-deep placeholder:text-slate/50 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'unverified', label: 'Unverified' },
            { id: 'verified', label: 'Verified' },
            { id: 'pending', label: 'Pending' },
          ].map((f) => (
            <button 
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === f.id 
                  ? 'bg-deep text-white border-deep shadow-brand-subtle' 
                  : 'bg-black/[0.02] text-slate border-utility hover:text-deep hover:bg-black/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-dashed border-utility rounded-3xl p-16 text-center space-y-4 shadow-brand-subtle">
          <div className="mx-auto w-16 h-16 bg-black/[0.02] text-slate/40 flex items-center justify-center rounded-2xl border border-utility">
            <Package size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-deep">No orders found</h3>
            <p className="text-slate text-sm max-w-sm mx-auto">
              There are no orders matching your current filters or search term in this pipeline.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-utility rounded-2xl overflow-hidden shadow-brand-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-utility bg-black/[0.02] text-slate/60 text-[10px] font-black uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Account</th>
                  <th className="py-3.5 px-6">Contact</th>
                  <th className="py-3.5 px-6">Product(s)</th>
                  <th className="py-3.5 px-6 text-right">Potential Value</th>
                  <th className="py-3.5 px-6">Verification</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-utility text-sm">
                {filteredOrders.map((order) => {
                  const store = storeMap[order.store_id];
                  const client = store?.clients && store.clients.length > 0 ? store.clients[0] : null;
                  const isSystemGenerated = store ? store.name.toLowerCase().startsWith('prospect') : false;
                  const displayStoreName = (isSystemGenerated && client ? client.name : (store ? store.name : ''))
                    .replace(/^prospect\s+/i, '')
                    .replace(/\s*\([^)]*\)\s*$/, '')
                    .trim();

                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => router.push(`/trade/operations/orders/${order.id}`)}
                      className="hover:bg-black/[0.015] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6 font-mono text-xs text-slate/70">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="py-4 px-6">
                        {store ? (
                          <Link 
                            href={`/trade/entities/prospects/${store.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-deep hover:text-deep/80 transition-colors flex items-center gap-1.5 relative z-10"
                          >
                            <MapPin size={13} className="text-slate/60" />
                            {displayStoreName}
                          </Link>
                        ) : (
                          <span className="text-slate/50 italic font-medium">Unknown Account</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {client && !isSystemGenerated ? (
                          <div className="flex items-center gap-1.5 font-semibold text-slate text-xs">
                            <UserIcon size={13} className="text-slate/60" />
                            {client.name}
                          </div>
                        ) : (
                          <span className="text-slate/40 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate text-xs">
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {order.items.map((item) => {
                              const prod = productMap[item.product_id];
                              return (
                                <div key={item.id}>
                                  <span className="font-mono font-bold text-deep">{item.quantity}x</span> {prod ? prod.name : 'Product'}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate/40">No items</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-deep font-mono">
                        ${(order.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6">
                        <BrandBadge 
                          variant={order.is_verified ? 'confirmed' : 'attention'} 
                          className="text-[10px] uppercase tracking-wider py-0 px-2"
                        >
                          {order.is_verified ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                          {order.is_verified ? 'Verified' : 'Unverified'}
                        </BrandBadge>
                      </td>
                      <td className="py-4 px-6">
                        <BrandBadge variant="neutral" className="text-[10px] uppercase font-mono py-0 px-2">
                          {order.status}
                        </BrandBadge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!order.is_verified && (
                            <BrandButton
                              variant="accent"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                verifyMutation.mutate(order.id);
                              }}
                              disabled={verifyMutation.isPending}
                              className="text-xs py-1 px-3 relative z-10"
                            >
                              Verify
                            </BrandButton>
                          )}
                          <Link 
                            href={`/trade/operations/orders/${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate/40 hover:text-deep hover:bg-black/5 rounded-lg transition-all relative z-10"
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProspectOrdersPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold text-slate/60">Loading orders...</div>}>
      <ProspectOrdersContent />
    </Suspense>
  );
}

