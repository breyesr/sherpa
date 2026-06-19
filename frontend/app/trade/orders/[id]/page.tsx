'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  ChevronLeft, 
  ShoppingBag, 
  Store as StoreIcon, 
  Calendar, 
  DollarSign, 
  Clock, 
  FileText, 
  Truck, 
  CheckCircle, 
  XCircle, 
  User, 
  MapPin, 
  CreditCard,
  Package,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { OrderResponse, StoreResponse, ProductResponse } from '@/types/api';

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Order Details
  const { data: order, isLoading: loadingOrder, error: orderError } = useQuery<OrderResponse>({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Order not found');
      return res.json();
    },
    enabled: !!token && !!id,
  });

  // Fetch Stores for mapping account names
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Products for line items names/SKUs
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

  // Lookup Maps
  const store = useMemo(() => {
    if (!order) return null;
    return stores.find(s => s.id === order.store_id) || null;
  }, [order, stores]);

  const productMap = useMemo(() => {
    const map: Record<string, ProductResponse> = {};
    products.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  // Handle status update
  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(newStatus);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/trade/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) throw new Error('Failed to update order status');
      
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusDetails = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { label: 'Pending Approval', color: 'text-amber-700 bg-amber-50 border-amber-100', icon: Clock, step: 0 };
      case 'confirmed':
        return { label: 'Confirmed', color: 'text-blue-700 bg-blue-50 border-blue-100', icon: CheckCircle, step: 1 };
      case 'shipped':
        return { label: 'Shipped', color: 'text-indigo-700 bg-indigo-50 border-indigo-100', icon: Truck, step: 2 };
      case 'delivered':
        return { label: 'Delivered', color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: CheckCircle, step: 3 };
      case 'cancelled':
        return { label: 'Cancelled', color: 'text-red-700 bg-red-50 border-red-100', icon: XCircle, step: -1 };
      default:
        return { label: 'Unknown', color: 'text-gray-700 bg-gray-50 border-gray-100', icon: Clock, step: 0 };
    }
  };

  if (loadingOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-gray-900" size={48} />
        <span className="font-bold text-gray-500">Loading Order Ledger Details...</span>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900">Order not found</h3>
        <p className="text-gray-500 mt-2">The order invoice may not exist or could be inaccessible.</p>
        <Link 
          href="/trade/orders"
          className="inline-flex items-center gap-2 mt-6 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-black transition-all"
        >
          <ChevronLeft size={16} /> Back to Ledger
        </Link>
      </div>
    );
  }

  const currentStatusInfo = getStatusDetails(order.status);
  const StatusIcon = currentStatusInfo.icon;
  const currentStep = currentStatusInfo.step;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Back Navigation */}
      <div>
        <Link 
          href="/trade/orders"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={18} />
          Back to Orders
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${currentStatusInfo.color}`}>
              <StatusIcon size={12} />
              {currentStatusInfo.label}
            </span>
            <span className="text-xs font-mono text-gray-400">Invoice ID: {order.id}</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">
            Order for {store ? store.name : 'Unknown Account'}
          </h1>
          <p className="text-sm font-bold text-gray-400 flex items-center gap-2">
            <Calendar size={14} />
            Placed on {new Date(order.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        {/* Cancel Action if applicable */}
        {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
          <button
            onClick={() => handleStatusChange('cancelled')}
            disabled={!!updatingStatus}
            className="flex items-center gap-2 bg-white text-red-600 px-5 py-3 border border-red-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          >
            {updatingStatus === 'cancelled' ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
            Cancel Order
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Items list & Notes */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Line Items Table */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Order Line Items</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="pb-4">Product Details</th>
                    <th className="pb-4 text-center">SKU</th>
                    <th className="pb-4 text-right">Unit Price</th>
                    <th className="pb-4 text-right">Quantity</th>
                    <th className="pb-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {order.items?.map((item) => {
                    const prod = productMap[item.product_id];
                    return (
                      <tr key={item.id} className="group">
                        <td className="py-5 pr-4 flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-2xs">
                            <Package size={20} />
                          </div>
                          <div>
                            <span className="font-black text-gray-900 block text-sm">{prod ? prod.name : 'Unknown Product'}</span>
                            <span className="text-[10px] font-bold text-gray-400 block mt-0.5">{prod?.brand || 'No Brand'}</span>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-center font-mono font-semibold text-xs text-gray-500">
                          {prod?.sku || '-'}
                        </td>
                        <td className="py-5 px-4 text-right font-bold text-gray-700 text-sm">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="py-5 px-4 text-right font-black text-gray-900 text-sm">
                          {item.quantity}
                        </td>
                        <td className="py-5 pl-4 text-right font-black text-gray-900 text-sm">
                          ${(item.quantity * item.unit_price).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes Card */}
          {order.notes && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-gray-400" /> Notes
              </h3>
              <p className="text-gray-600 text-sm font-medium leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Status Timeline & Summary */}
        <div className="space-y-8">
          
          {/* Timeline & Actions */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Status Timeline</h3>
            
            {currentStep !== -1 ? (
              /* Linear Status Process */
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {[
                  { statusKey: 'PENDING', label: 'Order Created', desc: 'Rep submitted order request.', stepNum: 0 },
                  { statusKey: 'CONFIRMED', label: 'Order Confirmed', desc: 'Order verified by admin.', stepNum: 1 },
                  { statusKey: 'SHIPPED', label: 'Shipped', desc: 'Dispatched to delivery carrier.', stepNum: 2 },
                  { statusKey: 'DELIVERED', label: 'Delivered', desc: 'Items received at account location.', stepNum: 3 }
                ].map((item) => {
                  const isDone = currentStep >= item.stepNum;
                  const isCurrent = currentStep === item.stepNum;
                  
                  return (
                    <div key={item.statusKey} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                        isDone 
                          ? 'bg-blue-600 border-blue-600 ring-4 ring-blue-50' 
                          : 'bg-white border-gray-300'
                      }`} />
                      
                      <div>
                        <h4 className={`text-sm font-black ${isCurrent ? 'text-blue-600' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                          {item.label}
                        </h4>
                        <p className="text-[11px] font-medium text-gray-400 mt-0.5">{item.desc}</p>
                        
                        {/* Quick state change action buttons */}
                        {isCurrent && item.stepNum < 3 && (
                          <button
                            onClick={() => {
                              const nextStatuses = ['confirmed', 'shipped', 'delivered'];
                              handleStatusChange(nextStatuses[item.stepNum]);
                            }}
                            disabled={!!updatingStatus}
                            className="mt-3 flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-2xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-50"
                          >
                            {updatingStatus ? (
                              <Loader2 className="animate-spin" size={12} />
                            ) : (
                              'Mark as ' + (item.stepNum === 0 ? 'Confirmed' : item.stepNum === 1 ? 'Shipped' : 'Delivered')
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Cancelled Timeline */
              <div className="flex items-center gap-4 bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100">
                <XCircle size={28} className="shrink-0" />
                <div>
                  <h4 className="font-black text-sm">Order Cancelled</h4>
                  <p className="text-2xs font-medium text-red-500 mt-0.5">This transaction has been terminated and stock was not drawn.</p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery & Account specifications */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Fulfillment details</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <StoreIcon className="text-gray-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Account Name</span>
                  {store ? (
                    <Link href={`/trade/stores/${store.id}`} className="font-bold text-gray-800 hover:text-blue-600 text-sm">
                      {store.name}
                    </Link>
                  ) : (
                    <span className="font-bold text-gray-800 text-sm">Unknown Account</span>
                  )}
                </div>
              </div>

              {order.shipping_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Shipping Address</span>
                    <span className="font-bold text-gray-800 text-sm">{order.shipping_address}</span>
                  </div>
                </div>
              )}

              {order.delivery_date && (
                <div className="flex items-start gap-3">
                  <Truck className="text-gray-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Delivery Date</span>
                    <span className="font-bold text-gray-800 text-sm">
                      {new Date(order.delivery_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CreditCard className="text-gray-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Payment Method</span>
                  <span className="font-bold text-gray-800 text-sm capitalize">{order.payment_method || 'Cash'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />

            <div className="relative space-y-6">
              <h3 className="text-lg font-black uppercase tracking-widest text-gray-400">Pricing Summary</h3>
              
              <div className="space-y-3 font-medium text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-bold">${(order.total_amount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Shipping (Mock)</span>
                  <span className="font-bold">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxes (Mock)</span>
                  <span className="font-bold">$0.00</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Grand Total</span>
                <span className="text-3xl font-black text-white">${(order.total_amount ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
