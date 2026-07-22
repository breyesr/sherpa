'use client';

import { useState, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
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
import { OrderResponse, StoreResponse, ProductResponse } from '@/types/api';

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
      const res = await fetch(`${API_BASE_URL}/trade/prospects/orders?segment=${segment}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch prospect orders');
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Prospect Stores to map store names
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores', { is_prospect: true, segment }],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores?is_prospect=true&prospect_segment=${segment}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Products to map product names in items
  const { data: products = [] } = useQuery<ProductResponse[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
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
      const res = await fetch(`${API_BASE_URL}/trade/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ is_verified: true })
      });
      if (!res.ok) throw new Error('Failed to verify order');
      return res.json();
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
      if (order.status === 'pending' || order.status === 'PENDING') {
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
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const isWholesale = segment === 'wholesale';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
            Inbound Intake
          </span>
        </div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tight capitalize">
          {isWholesale ? 'Wholesale Lead Orders' : 'Retail Referral Orders'}
        </h1>
        <p className="text-gray-500 mt-2 font-medium text-lg max-w-3xl">
          {isWholesale 
            ? 'Incoming wholesale order requests automatically qualified from WhatsApp/Telegram campaigns.' 
            : 'Order requests submitted by retail store referrals.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Potential Volume</p>
            <p className="text-3xl font-black text-gray-900">
              ${stats.totalPotentialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Unverified Drafts</p>
            <p className="text-3xl font-black text-gray-900">{stats.unverifiedCount}</p>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Qualified</p>
            <p className="text-3xl font-black text-gray-900">{orders.length}</p>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <ClipboardList size={24} />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search orders, stores, contacts..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            All
          </button>
          <button 
            onClick={() => setStatusFilter('unverified')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'unverified' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            Unverified
          </button>
          <button 
            onClick={() => setStatusFilter('verified')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'verified' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            Verified
          </button>
          <button 
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${statusFilter === 'pending' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-16 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-gray-50 text-gray-400 flex items-center justify-center rounded-2xl">
            <Package size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900">No orders found</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              There are no orders matching your current filters or search term in this pipeline.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-4 px-6">Order</th>
                  <th className="py-4 px-6">Account</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Product(s)</th>
                  <th className="py-4 px-6 text-right">Potential Value</th>
                  <th className="py-4 px-6">Verification</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
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
                      onClick={() => router.push(`/trade/orders/${order.id}`)}
                      className="hover:bg-gray-50/30 transition-colors cursor-pointer"
                    >
                      <td className="py-5 px-6 font-mono text-xs text-gray-400">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="py-5 px-6">
                        {store ? (
                          <Link 
                            href={`/trade/prospects/${store.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1.5 relative z-10"
                          >
                            <MapPin size={14} className="text-gray-400" />
                            {displayStoreName}
                          </Link>
                        ) : (
                          <span className="text-gray-400 italic font-medium">Unknown Account</span>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        {client && !isSystemGenerated ? (
                          <div className="flex items-center gap-1.5 font-semibold text-gray-700">
                            <UserIcon size={14} className="text-gray-400" />
                            {client.name}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-5 px-6 font-medium text-gray-600">
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {order.items.map((item) => {
                              const prod = productMap[item.product_id];
                              return (
                                <div key={item.id} className="text-xs">
                                  {item.quantity}x {prod ? prod.name : 'Product'}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">No items</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-right font-black text-gray-900">
                        ${(order.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-5 px-6">
                        {order.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <CheckCircle size={10} /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                            <AlertCircle size={10} /> Unverified
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        <span className="inline-flex text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!order.is_verified && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                verifyMutation.mutate(order.id);
                              }}
                              disabled={verifyMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm font-sans relative z-10"
                            >
                              Verify
                            </button>
                          )}
                          <Link 
                            href={`/trade/orders/${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all relative z-10"
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
    <Suspense fallback={<div className="p-20 text-center font-bold text-gray-400">Loading orders...</div>}>
      <ProspectOrdersContent />
    </Suspense>
  );
}
