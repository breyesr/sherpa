'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  ChevronLeft, 
  ShoppingBag, 
  Store as StoreIcon, 
  Calendar, 
  Clock, 
  FileText, 
  Truck, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  CreditCard,
  Package,
  Loader2,
  AlertCircle,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { components } from '@/types/api';
import { BrandButton, BrandBadge, BrandCard } from '@/components/ui/brand';

type OrderResponse = components['schemas']['OrderResponse'];
type StoreResponse = components['schemas']['StoreResponse'];
type ProductResponse = components['schemas']['ProductResponse'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch Order Details
  const { data: order, isLoading: loadingOrder, error: orderError } = useQuery<OrderResponse>({
    queryKey: ['order', id],
    queryFn: async () => {
      return await apiClient.get<OrderResponse>(`/trade/orders/${id}`);
    },
    enabled: !!token && !!id,
  });

  // Fetch Store for mapping account name
  const { data: store = null } = useQuery<StoreResponse | null>({
    queryKey: ['store', order?.store_id],
    queryFn: async () => {
      try {
        return await apiClient.get<StoreResponse>(`/trade/stores/${order?.store_id}`);
      } catch {
        return null;
      }
    },
    enabled: !!token && !!order?.store_id,
  });

  // Fetch Products for line items names/SKUs
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

  const displayStoreName = useMemo(() => {
    if (!store) return 'Unknown Account';
    const isSystemGenerated = store.name.toLowerCase().startsWith('prospect');
    const hasClientName = store.clients && store.clients[0]?.name;
    let resolvedName = isSystemGenerated && hasClientName ? (store.clients?.[0]?.name || '') : store.name;
    resolvedName = resolvedName.replace(/^prospect\s+/i, '');
    resolvedName = resolvedName.replace(/\s*\([^)]*\)\s*$/, '');
    return resolvedName.trim();
  }, [store]);

  const productMap = useMemo(() => {
    const map: Record<string, ProductResponse> = {};
    products.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  // Handle status update (both forward and backward progression - Epic 205.2)
  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(newStatus);
    setErrorMessage('');
    try {
      await apiClient.patch<void>(`/trade/orders/${id}`, { status: newStatus });
      
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleteLoading(true);
    setErrorMessage('');
    try {
      await apiClient.delete(`/trade/orders/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/trade/operations/orders');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error deleting order');
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  };

  const getStatusDetails = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { label: 'Pending Approval', variant: 'attention' as const, icon: Clock, step: 0 };
      case 'confirmed':
        return { label: 'Confirmed', variant: 'accent' as const, icon: CheckCircle, step: 1 };
      case 'shipped':
        return { label: 'Shipped', variant: 'neutral' as const, icon: Truck, step: 2 };
      case 'delivered':
        return { label: 'Delivered', variant: 'confirmed' as const, icon: CheckCircle, step: 3 };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'alert' as const, icon: XCircle, step: -1 };
      default:
        return { label: status, variant: 'neutral' as const, icon: Clock, step: 0 };
    }
  };

  if (loadingOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-deep" size={40} />
        <span className="font-bold text-slate/70 text-sm">Loading Order Ledger Details...</span>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <BrandCard className="max-w-2xl mx-auto p-12 text-center">
        <AlertCircle size={40} className="text-alert mx-auto mb-4" />
        <h3 className="text-xl font-black text-deep">Order not found</h3>
        <p className="text-slate text-sm mt-1">The order invoice may not exist or could be inaccessible.</p>
        <Link 
          href="/trade/operations/orders"
          className="inline-flex items-center gap-2 mt-6"
        >
          <BrandButton variant="primary">
            <ChevronLeft size={16} /> Back to Ledger
          </BrandButton>
        </Link>
      </BrandCard>
    );
  }

  const currentStatusInfo = getStatusDetails(order.status || 'pending');
  const StatusIcon = currentStatusInfo.icon;
  const currentStep = currentStatusInfo.step;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Back Navigation */}
      <div>
        <Link 
          href="/trade/operations/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate hover:text-deep transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Orders
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <BrandBadge variant={currentStatusInfo.variant} className="text-xs uppercase tracking-wider py-0.5 px-3">
              <StatusIcon size={12} />
              {currentStatusInfo.label}
            </BrandBadge>
            <span className="text-xs font-mono text-slate/60">Invoice ID: #{order.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-deep tracking-tight leading-tight">
            Order for {displayStoreName}
          </h1>
          <p className="text-xs font-bold text-slate/70 flex items-center gap-2">
            <Calendar size={13} className="text-slate/50" />
            Placed on {new Date(order.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={!!updatingStatus || deleteLoading}
              className="flex items-center gap-1.5 bg-white text-slate hover:text-alert border border-utility hover:border-alert/30 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-brand-subtle"
            >
              {updatingStatus === 'cancelled' ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
              Cancel Order
            </button>
          )}

          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleteLoading}
              className="px-4 py-2.5 bg-white hover:bg-black/5 text-slate rounded-xl text-xs font-black uppercase tracking-wider border border-utility transition-all active:scale-95 shadow-brand-subtle"
            >
              Keep Order
            </button>
          )}

          <button
            onClick={handleDeleteOrder}
            disabled={deleteLoading}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border shadow-brand-subtle ${
              confirmDelete
                ? 'bg-alert text-white border-alert animate-pulse'
                : 'bg-white text-alert border-alert/20 hover:bg-alert/5'
            }`}
          >
            {deleteLoading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            {confirmDelete ? 'Confirm Delete' : 'Delete Order'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-alert/5 text-alert rounded-2xl border border-alert/20 text-sm font-bold flex items-center gap-2">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Items list & Notes */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Line Items Table */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-utility shadow-brand-subtle space-y-6">
            <h3 className="text-xl font-black text-deep tracking-tight">Order Line Items</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-utility text-[10px] font-black text-slate/60 uppercase tracking-widest font-mono">
                    <th className="pb-3">Product Details</th>
                    <th className="pb-3 text-center">SKU</th>
                    <th className="pb-3 text-right">Unit Price</th>
                    <th className="pb-3 text-right">Quantity</th>
                    <th className="pb-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-utility text-sm">
                  {order.items?.map((item) => {
                    const prod = productMap[item.product_id];
                    return (
                      <tr key={item.id} className="group">
                        <td className="py-4 pr-4 flex items-center gap-3">
                          <div className="w-10 h-10 bg-deep/5 text-deep border border-utility rounded-xl flex items-center justify-center shrink-0">
                            <Package size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-deep block text-sm">{prod ? prod.name : 'Unknown Product'}</span>
                            <span className="text-[10px] font-bold text-slate/50 block mt-0.5">{prod?.brand || 'Generic'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-medium text-xs text-slate/70">
                          {prod?.sku || '-'}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate text-sm">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-black text-deep text-sm">
                          {item.quantity}
                        </td>
                        <td className="py-4 pl-4 text-right font-mono font-black text-deep text-sm">
                          ${((item.quantity || 0) * item.unit_price).toFixed(2)}
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
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-utility shadow-brand-subtle space-y-3">
              <h3 className="text-xs font-black text-slate uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} className="text-slate/60" /> Operational Notes
              </h3>
              <p className="text-deep text-sm font-medium leading-relaxed bg-black/[0.02] p-4 rounded-xl border border-utility">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Status Timeline & Summary */}
        <div className="space-y-8">
          
          {/* Timeline & Actions with Backward Progression (Epic 205.2) */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-utility shadow-brand-subtle space-y-6">
            <h3 className="text-lg font-black text-deep tracking-tight">Status Timeline</h3>
            
            {currentStep !== -1 ? (
              /* Linear Status Process */
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-utility">
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
                      <span className={`absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        isDone 
                          ? 'bg-deep border-deep ring-4 ring-deep/10' 
                          : 'bg-white border-utility'
                      }`} />
                      
                      <div>
                        <h4 className={`text-sm font-black ${isCurrent ? 'text-deep' : isDone ? 'text-slate' : 'text-slate/40'}`}>
                          {item.label}
                        </h4>
                        <p className="text-[11px] font-medium text-slate/60 mt-0.5">{item.desc}</p>
                        
                        {/* Quick state change action buttons (Epic 205.2) */}
                        {isCurrent && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {/* Forward Progression */}
                            {item.stepNum < 3 && (
                              <BrandButton
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  const nextStatuses = ['confirmed', 'shipped', 'delivered'];
                                  handleStatusChange(nextStatuses[item.stepNum]);
                                }}
                                disabled={!!updatingStatus}
                                className="text-2xs uppercase tracking-wider"
                              >
                                {updatingStatus === (item.stepNum === 0 ? 'confirmed' : item.stepNum === 1 ? 'shipped' : 'delivered') ? (
                                  <Loader2 className="animate-spin" size={12} />
                                ) : (
                                  'Mark as ' + (item.stepNum === 0 ? 'Confirmed' : item.stepNum === 1 ? 'Shipped' : 'Delivered')
                                )}
                              </BrandButton>
                            )}

                            {/* Backwards Progression (Epic 205.2) */}
                            {item.stepNum > 0 && (
                              <BrandButton
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const prevStatuses = ['pending', 'confirmed', 'shipped'];
                                  handleStatusChange(prevStatuses[item.stepNum - 1]);
                                }}
                                disabled={!!updatingStatus}
                                className="text-2xs uppercase tracking-wider text-slate hover:text-deep"
                              >
                                {updatingStatus === (item.stepNum === 1 ? 'pending' : item.stepNum === 2 ? 'confirmed' : 'shipped') ? (
                                  <Loader2 className="animate-spin" size={12} />
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <RotateCcw size={10} />
                                    {'Revert to ' + (item.stepNum === 1 ? 'Pending' : item.stepNum === 2 ? 'Confirmed' : 'Shipped')}
                                  </span>
                                )}
                              </BrandButton>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Cancelled Timeline */
              <div className="flex items-center gap-3 bg-alert/5 text-alert p-4 rounded-xl border border-alert/20">
                <XCircle size={22} className="shrink-0" />
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider">Order Cancelled</h4>
                  <p className="text-2xs font-medium text-slate mt-0.5">This transaction has been terminated and inventory stock was not drawn.</p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery & Account specifications */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-utility shadow-brand-subtle space-y-4">
            <h3 className="text-lg font-black text-deep tracking-tight">Fulfillment Details</h3>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-3">
                <StoreIcon className="text-slate/60 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="text-[10px] font-black text-slate/60 uppercase tracking-widest block">Account Name</span>
                  {store ? (
                    <Link href={`/trade/entities/stores/${store.id}`} className="font-bold text-deep hover:text-deep/80 text-sm">
                      {displayStoreName}
                    </Link>
                  ) : (
                    <span className="font-bold text-deep text-sm">Unknown Account</span>
                  )}
                </div>
              </div>

              {order.shipping_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-slate/60 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] font-black text-slate/60 uppercase tracking-widest block">Shipping Address</span>
                    <span className="font-bold text-deep text-sm">{order.shipping_address}</span>
                  </div>
                </div>
              )}

              {order.delivery_date && (
                <div className="flex items-start gap-3">
                  <Truck className="text-slate/60 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="text-[10px] font-black text-slate/60 uppercase tracking-widest block">Delivery Date</span>
                    <span className="font-mono font-bold text-deep text-sm">
                      {new Date(order.delivery_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CreditCard className="text-slate/60 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="text-[10px] font-black text-slate/60 uppercase tracking-widest block">Payment Method</span>
                  <span className="font-bold text-deep text-sm capitalize">{order.payment_method || 'Cash'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="bg-deep text-white p-6 md:p-8 rounded-2xl shadow-brand-card relative overflow-hidden border border-deep">
            <div className="relative space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Pricing Summary</h3>
              
              <div className="space-y-2.5 font-medium text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Subtotal</span>
                  <span className="font-mono font-bold">${(order.total_amount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Shipping</span>
                  <span className="font-mono font-bold">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Taxes</span>
                  <span className="font-mono font-bold">$0.00</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest text-white/70">Grand Total</span>
                <span className="text-2xl font-black text-white font-mono">${(order.total_amount ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

