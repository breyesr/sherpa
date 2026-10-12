'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  ChevronRight, 
  Calendar, 
  DollarSign, 
  Layers, 
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Hourglass
} from 'lucide-react';
import { components } from '@/types/api';
import { useDrawerStore } from '@/lib/store/DrawerManager';
import { BrandButton, BrandBadge, BrandCard } from '@/components/ui/brand';

type OrderResponse = components['schemas']['OrderResponse'];
type StoreResponse = components['schemas']['StoreResponse'];

export default function OrdersPage() {
  const token = useAuthStore((state) => state.token);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // Fetch Orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery<OrderResponse[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      return await apiClient.get<OrderResponse[]>('/trade/orders');
    },
    enabled: !!token,
  });

  // Fetch Stores and Prospects for mapping account names
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['all-stores-for-orders'],
    queryFn: async () => {
      const [storesList, prospectsList] = await Promise.all([
        apiClient.get<StoreResponse[]>('/trade/stores').catch(() => []),
        apiClient.get<StoreResponse[]>('/trade/stores?is_prospect=true').catch(() => [])
      ]);
      
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

      const orderStatus = (order.status || '').toLowerCase();
      const matchesStatus = selectedStatus === 'all' || orderStatus === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, selectedStatus, storeMap]);

  // Aggregated analytics
  const stats = useMemo(() => {
    const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered');
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return {
      totalCount: orders.length,
      activeCount: activeOrders.length,
      totalRevenue
    };
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { variant: 'attention' as const, icon: Hourglass, label: 'Pending' };
      case 'confirmed':
        return { variant: 'accent' as const, icon: CheckCircle, label: 'Confirmed' };
      case 'shipped':
        return { variant: 'neutral' as const, icon: Truck, label: 'Shipped' };
      case 'delivered':
        return { variant: 'confirmed' as const, icon: CheckCircle, label: 'Delivered' };
      case 'cancelled':
        return { variant: 'alert' as const, icon: XCircle, label: 'Cancelled' };
      default:
        return { variant: 'neutral' as const, icon: Clock, label: status };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8 pb-12 sm:pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <BrandBadge variant="accent" className="text-[10px] uppercase tracking-widest font-black">
              Operations
            </BrandBadge>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-deep tracking-tight">
            Orders Ledger
          </h1>
          <p className="text-slate mt-1 sm:mt-2 font-medium text-xs sm:text-base md:text-lg max-w-2xl">
            Monitor store accounts, order values, shipment timelines, and sales fulfillment metrics.
          </p>
        </div>
        <BrandButton 
          variant="primary"
          size="md"
          onClick={() => openDrawer('order')}
          className="shadow-brand-subtle sm:h-12 w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          Create Order
        </BrandButton>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <BrandCard className="flex items-center gap-3.5 sm:gap-5 p-3.5 sm:p-5 lg:p-6">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-deep/5 text-deep border border-utility flex items-center justify-center shrink-0">
            <DollarSign size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-black text-slate/60 uppercase tracking-widest">Gross Revenue</span>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-deep mt-0.5 font-mono truncate">
              ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </BrandCard>

        <BrandCard className="flex items-center gap-3.5 sm:gap-5 p-3.5 sm:p-5 lg:p-6">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
            <ShoppingBag size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-black text-slate/60 uppercase tracking-widest">Active Orders</span>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-deep mt-0.5 font-mono">{stats.activeCount}</h3>
          </div>
        </BrandCard>

        <BrandCard className="flex items-center gap-3.5 sm:gap-5 p-3.5 sm:p-5 lg:p-6 sm:col-span-2 lg:col-span-1">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-deep/5 text-deep border border-utility flex items-center justify-center shrink-0">
            <Layers size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-black text-slate/60 uppercase tracking-widest">Total Orders Ledger</span>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-deep mt-0.5 font-mono">{stats.totalCount}</h3>
          </div>
        </BrandCard>
      </div>

      {/* Control Bar & Filter Tabs */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between items-stretch lg:items-center bg-white p-3 sm:p-4 rounded-2xl border border-utility shadow-brand-subtle">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate/50" size={16} />
          <input 
            type="text"
            placeholder="Search accounts, notes, ID..."
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-black/[0.02] border border-utility rounded-xl focus:border-deep focus:ring-2 focus:ring-deep/10 outline-none transition-all font-medium text-deep placeholder:text-slate/50 text-xs sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Status Tabs (Smooth Horizontal Swipe on Mobile) */}
        <div className="flex overflow-x-auto no-scrollbar p-1 bg-black/[0.02] rounded-xl border border-utility w-full lg:w-auto gap-1">
          {['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map((status) => {
            const isActive = (selectedStatus === 'all' && status === 'All') || selectedStatus === status.toLowerCase();
            return (
              <button 
                key={status}
                onClick={() => setSelectedStatus(status.toLowerCase())}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-deep text-white shadow-brand-subtle' 
                    : 'text-slate/70 hover:text-deep hover:bg-black/5'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Directory Content */}
      {loadingOrders ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-deep border-t-transparent"></div>
          <span className="font-bold text-slate/60 text-sm">Loading orders...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-utility shadow-brand-subtle p-10 sm:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black/[0.03] text-slate/40 rounded-2xl flex items-center justify-center mb-4 border border-utility">
            <ShoppingBag size={24} className="sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-deep">No orders found</h3>
          <p className="text-slate text-xs sm:text-sm mt-1">Try adjusting your search query or status filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-utility shadow-brand-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[880px] divide-y divide-utility">
              {/* Header Row */}
              <div className="grid grid-cols-[minmax(220px,1.5fr)_140px_130px_90px_140px_120px_40px] items-center p-3.5 sm:p-4 lg:p-6 bg-black/[0.02] text-[10px] font-black text-slate/60 uppercase tracking-widest border-b border-utility font-mono">
                <div>Account & Invoice ID</div>
                <div>Order Date</div>
                <div>Status</div>
                <div className="text-right pr-2">Items</div>
                <div className="pl-2">Payment Method</div>
                <div className="text-right">Total Amount</div>
                <div></div>
              </div>

              {/* Order Item list */}
              {filteredOrders.map((order) => {
                const store = storeMap[order.store_id];
                const totalItems = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                const statusBadge = getStatusBadge(order.status || 'pending');
                const StatusIcon = statusBadge.icon;
                
                return (
                  <div 
                    key={order.id} 
                    className="group relative grid grid-cols-[minmax(220px,1.5fr)_140px_130px_90px_140px_120px_40px] items-center p-3.5 sm:p-4 lg:p-6 hover:bg-black/[0.015] transition-all cursor-pointer"
                  >
                    <Link 
                      href={`/trade/operations/orders/${order.id}`}
                      className="absolute inset-0 z-0"
                    />
                    
                    {/* Account & ID */}
                    <div className="relative z-10 flex items-center gap-3 sm:gap-4 pointer-events-none min-w-0 pr-4">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-deep/5 text-deep border border-utility flex items-center justify-center group-hover:bg-deep group-hover:text-white transition-all shadow-brand-subtle shrink-0">
                        <ShoppingBag size={18} className="sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-deep group-hover:text-deep/80 transition-colors truncate">
                          {store ? (
                            (() => {
                              const isSystemGenerated = store.name.toLowerCase().startsWith('prospect');
                              const hasClientName = store.clients && store.clients[0]?.name;
                              let resolved = isSystemGenerated && hasClientName ? (store.clients?.[0]?.name || '') : store.name;
                              resolved = resolved.replace(/^prospect\s+/i, '');
                              resolved = resolved.replace(/\s*\([^)]*\)\s*$/, '');
                              return resolved.trim();
                            })()
                          ) : 'Unknown Account'}
                        </h3>
                        <p className="text-xs font-mono text-slate/60 mt-0.5 truncate">
                          #{order.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    {/* Order Date */}
                    <div className="relative z-10 pointer-events-none flex items-center gap-1.5 text-slate font-medium text-xs">
                      <Calendar size={13} className="text-slate/50" />
                      <span>{new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    {/* Status */}
                    <div className="relative z-10 pointer-events-none">
                      <BrandBadge 
                        variant={statusBadge.variant} 
                        className="text-[10px] uppercase font-bold tracking-wider py-0 px-2"
                      >
                        <StatusIcon size={10} />
                        {statusBadge.label}
                      </BrandBadge>
                    </div>

                    {/* Items */}
                    <div className="relative z-10 text-right font-medium text-slate text-xs pointer-events-none pr-2">
                      <span className="font-mono font-bold text-deep">{totalItems}</span> {totalItems === 1 ? 'item' : 'items'}
                    </div>

                    {/* Payment Method */}
                    <div className="relative z-10 pointer-events-none text-slate font-medium text-xs capitalize pl-2">
                      {order.payment_method || 'Cash'}
                    </div>

                    {/* Total Amount */}
                    <div className="relative z-10 text-right font-black text-deep text-base font-mono pointer-events-none">
                      ${(order.total_amount ?? 0).toFixed(2)}
                    </div>

                    {/* Chevron */}
                    <div className="relative z-10 flex justify-end">
                      <ChevronRight size={18} className="text-slate/40 group-hover:text-deep group-hover:translate-x-1 transition-all pointer-events-none" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

