'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  ChevronRight, 
  Calendar, 
  DollarSign, 
  Layers, 
  TrendingUp, 
  MapPin, 
  AlertCircle,
  Truck,
  CheckCircle,
  XCircle,
  Hourglass
} from 'lucide-react';
import { OrderResponse, StoreResponse } from '@/types/api';
import OrderDrawer from '@/components/v2/OrderDrawer';

export default function OrdersPage() {
  const token = useAuthStore((state) => state.token);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);

  // Fetch Orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery<OrderResponse[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Stores and Prospects for mapping account names
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['all-stores-for-orders'],
    queryFn: async () => {
      const [storesRes, prospectsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/trade/stores`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/trade/stores?is_prospect=true`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const storesList = storesRes.ok ? await storesRes.json() : [];
      const prospectsList = prospectsRes.ok ? await prospectsRes.json() : [];
      
      return [...storesList, ...prospectsList];
    },
    enabled: !!token,
  });

  // Store mapping for account lookup
  const storeMap = useMemo(() => {
    const map: Record<string, StoreResponse> = {};
    stores.forEach(store => {
      map[store.id] = store;
    });
    return map;
  }, [stores]);

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const store = storeMap[order.store_id];
      const storeName = store ? store.name.toLowerCase() : '';
      const notes = order.notes ? order.notes.toLowerCase() : '';
      const orderId = order.id.toLowerCase();
      
      const matchesSearch = 
        storeName.includes(searchTerm.toLowerCase()) ||
        notes.includes(searchTerm.toLowerCase()) ||
        orderId.includes(searchTerm.toLowerCase());

      // API statuses are case insensitive or lowercase, let's normalize
      const orderStatus = (order.status || '').toLowerCase();
      const matchesStatus = selectedStatus === 'all' || orderStatus === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, selectedStatus, storeMap]);

  // Aggregated analytics
  const stats = useMemo(() => {
    const activeOrders = orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED');
    const totalRevenue = orders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return {
      totalCount: orders.length,
      activeCount: activeOrders.length,
      totalRevenue
    };
  }, [orders]);

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-100', icon: Hourglass };
      case 'confirmed':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-100', icon: CheckCircle };
      case 'shipped':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Truck };
      case 'delivered':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle };
      case 'cancelled':
        return { bg: 'bg-red-50 text-red-700 border-red-100', icon: XCircle };
      default:
        return { bg: 'bg-gray-50 text-gray-700 border-gray-100', icon: Hourglass };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            Orders Ledger
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg max-w-2xl">
            Monitor accounts, order values, shipment timelines, and sales fulfillment metrics.
          </p>
        </div>
        <button 
          onClick={() => setIsOrderDrawerOpen(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-xl hover:bg-black transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} />
          Create Order
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <DollarSign size={28} />
          </div>
          <div>
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Gross Revenue</span>
            <h3 className="text-3xl font-black text-gray-900 mt-1">${stats.totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <ShoppingBag size={28} />
          </div>
          <div>
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Active Orders</span>
            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.activeCount}</h3>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Layers size={28} />
          </div>
          <div>
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Orders Ledger</span>
            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.totalCount}</h3>
          </div>
        </div>
      </div>

      {/* Control Bar & Filter Tabs */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search accounts, notes, ID..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Status Tabs */}
        <div className="flex flex-wrap p-1.5 bg-gray-50 rounded-2xl w-full md:w-auto overflow-x-auto">
          {['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
            <button 
              key={status}
              onClick={() => setSelectedStatus(status.toLowerCase())}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                (selectedStatus === 'all' && status === 'All') || selectedStatus === status.toLowerCase()
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Directory Content */}
      {loadingOrders ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
          <span className="font-bold text-gray-500">Loading orders...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-[2rem] flex items-center justify-center mb-6">
            <ShoppingBag size={36} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No orders found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search query or status filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {/* Header Row */}
            <div className="hidden md:flex items-center justify-between p-8 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
              <div className="flex-1">Account & Invoice ID</div>
              <div className="w-40">Order Date</div>
              <div className="w-32">Status</div>
              <div className="w-32 text-right">Items</div>
              <div className="w-40">Payment Method</div>
              <div className="w-36 text-right">Total Amount</div>
              <div className="w-16"></div>
            </div>

            {/* Order Item list */}
            {filteredOrders.map((order) => {
              const store = storeMap[order.store_id];
              const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
              const statusStyle = getStatusStyle(order.status);
              const StatusIcon = statusStyle.icon;
              
              return (
                <div key={order.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-8 hover:bg-gray-50/50 transition-all cursor-pointer">
                  <Link 
                    href={`/trade/orders/${order.id}`}
                    className="absolute inset-0 z-0"
                  />
                  
                  <div className="relative z-10 flex items-center gap-6 pointer-events-none flex-1">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm shrink-0">
                      <ShoppingBag size={28} />
                    </div>
                    <div className="min-w-0 pr-4">
                      <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {store ? (
                          (() => {
                            const isSystemGenerated = store.name.toLowerCase().startsWith('prospect');
                            const hasClientName = store.clients && store.clients[0]?.name;
                            let resolved = isSystemGenerated && hasClientName ? store.clients[0].name : store.name;
                            resolved = resolved.replace(/^prospect\s+/i, '');
                            resolved = resolved.replace(/\s*\([^)]*\)\s*$/, '');
                            return resolved.trim();
                          })()
                        ) : 'Unknown Account'}
                      </h3>
                      <p className="text-xs font-mono text-gray-400 mt-1 max-w-sm truncate">
                        ID: {order.id}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-wrap items-center justify-between md:justify-end gap-6 mt-6 md:mt-0 w-full md:w-auto">
                    <div className="w-40 pointer-events-none flex items-center gap-2 text-gray-500 font-bold text-sm">
                      <Calendar size={14} className="text-gray-300" />
                      {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    <div className="w-32 pointer-events-none">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider border ${statusStyle.bg}`}>
                        <StatusIcon size={10} />
                        {order.status}
                      </span>
                    </div>

                    <div className="w-32 md:text-right font-bold text-gray-500 text-sm pointer-events-none">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                    </div>

                    <div className="w-40 pointer-events-none text-gray-500 font-bold text-sm capitalize">
                      {order.payment_method || 'Cash'}
                    </div>

                    <div className="w-36 md:text-right font-black text-gray-900 text-lg pointer-events-none">
                      ${(order.total_amount ?? 0).toFixed(2)}
                    </div>

                    <div className="w-16 flex justify-end">
                      <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all pointer-events-none" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Order Drawer */}
      <OrderDrawer 
        isOpen={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        token={token}
      />
    </div>
  );
}
