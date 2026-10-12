'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  ChevronLeft, 
  Package, 
  DollarSign, 
  Store as StoreIcon, 
  Calendar, 
  Edit2, 
  Trash2, 
  Loader2, 
  AlertCircle,
  Boxes
} from 'lucide-react';
import { components } from '@/types/api';
import { useDrawerStore } from '@/lib/store/DrawerManager';
import { BrandCard, BrandButton, BrandBadge } from '@/components/ui/brand';

type ProductResponse = components['schemas']['ProductResponse'];
type StoreResponse = components['schemas']['StoreResponse'];
type OrderResponse = components['schemas']['OrderResponse'];
type CategoryResponse = components['schemas']['CategoryResponse'];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch Product details
  const { data: product, isLoading: loadingProduct, error: productError } = useQuery<ProductResponse>({
    queryKey: ['product', id],
    queryFn: async () => {
      return await apiClient.get<ProductResponse>(`/trade/products/${id}`);
    },
    enabled: !!token && !!id,
  });

  // Fetch Stores
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      try {
        return await apiClient.get<StoreResponse[]>('/trade/stores');
      } catch {
        return [];
      }
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

  // Fetch Orders
  const { data: orders = [] } = useQuery<OrderResponse[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        return await apiClient.get<OrderResponse[]>('/trade/orders');
      } catch {
        return [];
      }
    },
    enabled: !!token,
  });

  // Category map for fast lookup
  const productCategory = useMemo(() => {
    if (!product || categories.length === 0) return null;
    return categories.find(c => c.id === product.category_id) || null;
  }, [product, categories]);

  const categoryName = useMemo(() => {
    return productCategory ? productCategory.name : 'Category';
  }, [productCategory]);

  const categoryFieldsMap = useMemo(() => {
    const map: Record<string, { label: string; type: string }> = {};
    if (productCategory && Array.isArray(productCategory.fields_config)) {
      (productCategory.fields_config as any[]).forEach(f => {
        if (f && f.key) {
          map[f.key] = { label: f.label || f.key, type: f.type || 'text' };
        }
      });
    }
    return map;
  }, [productCategory]);

  // Store map for fast lookup
  const storeMap = useMemo(() => {
    const map: Record<string, StoreResponse> = {};
    stores.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [stores]);

  // Filter orders containing this product client-side
  const orderHistory = useMemo(() => {
    if (!id || orders.length === 0) return [];
    
    return orders
      .filter(order => (order.items || []).some(item => item.product_id === id))
      .map(order => {
        const item = (order.items || []).find(i => i.product_id === id)!;
        return {
          ...order,
          quantityOrdered: item?.quantity || 0,
          unitPriceOrdered: item?.unit_price || 0,
          itemTotal: (item?.quantity || 0) * (item?.unit_price || 0),
          storeName: storeMap[order.store_id]?.name || 'Unknown Account'
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [id, orders, storeMap]);

  // Group by store to determine stocking status
  const stockingStores = useMemo(() => {
    const map: Record<string, { totalQty: number; totalRevenue: number; lastOrdered: string }> = {};
    
    orderHistory.forEach(order => {
      if (!map[order.store_id]) {
        map[order.store_id] = { totalQty: 0, totalRevenue: 0, lastOrdered: order.created_at };
      } else {
        const currentLast = new Date(map[order.store_id].lastOrdered).getTime();
        const nextDate = new Date(order.created_at).getTime();
        if (nextDate > currentLast) {
          map[order.store_id].lastOrdered = order.created_at;
        }
      }
      map[order.store_id].totalQty += order.quantityOrdered;
      map[order.store_id].totalRevenue += order.itemTotal;
    });

    return Object.entries(map).map(([storeId, stats]) => {
      const store = storeMap[storeId];
      return {
        id: storeId,
        name: store?.name || 'Unknown Account',
        address: store?.address || 'No Address',
        region: store?.region || 'National',
        segment: store?.segment || 'General',
        totalQty: stats.totalQty,
        totalRevenue: stats.totalRevenue,
        lastOrdered: stats.lastOrdered
      };
    }).sort((a, b) => b.totalQty - a.totalQty);
  }, [orderHistory, storeMap]);

  // Aggregated analytics
  const stats = useMemo(() => {
    const totalRevenue = orderHistory.reduce((sum, order) => sum + order.itemTotal, 0);
    const totalUnits = orderHistory.reduce((sum, order) => sum + order.quantityOrdered, 0);
    const activeStoresCount = stockingStores.length;
    
    return {
      totalRevenue,
      totalUnits,
      activeStoresCount
    };
  }, [orderHistory, stockingStores]);

  const handleDelete = async () => {
    setDeleteError(null);

    // Business guardrail: products with historical order lines cannot be deleted directly
    if (orderHistory.length > 0) {
      setDeleteError(`Cannot delete "${product?.name || 'this product'}": It is referenced in ${orderHistory.length} historical order(s). Products with sales history cannot be deleted to preserve order audit integrity.`);
      setConfirmDelete(false);
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleteLoading(true);
    try {
      await apiClient.delete<void>(`/trade/products/${id}`);
      
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      router.push('/trade/catalog/products');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete product';
      setDeleteError(message);
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-dark-accent border-t-transparent"></div>
        <span className="font-semibold text-slate text-sm">Loading product specifications...</span>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="max-w-4xl mx-auto p-12 font-sans">
        <BrandCard className="p-12 text-center flex flex-col items-center justify-center">
          <AlertCircle size={40} className="text-alert mb-4" />
          <h3 className="text-xl font-bold text-deep">Product not found</h3>
          <p className="text-slate text-sm mt-1 max-w-sm">The product might have been deleted, or there was a network connection error.</p>
          <div className="mt-6">
            <Link href="/trade/catalog/products">
              <BrandButton variant="secondary">
                <ChevronLeft size={16} /> Back to Catalog
              </BrandButton>
            </Link>
          </div>
        </BrandCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Back & Actions Navigation */}
      <div className="flex justify-between items-center">
        <Link 
          href="/trade/catalog/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate hover:text-deep transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Catalog
        </Link>

        <div className="flex items-center gap-3">
          <BrandButton 
            variant="secondary"
            onClick={() => openDrawer('catalog', { productId: id, initialData: product })}
          >
            <Edit2 size={14} />
            Edit Product
          </BrandButton>
          {confirmDelete && (
            <BrandButton
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteLoading}
            >
              Cancel
            </BrandButton>
          )}
          <button 
            onClick={handleDelete}
            disabled={deleteLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              confirmDelete 
                ? 'bg-alert text-white border-alert animate-pulse' 
                : 'bg-surface text-alert border-alert/20 hover:bg-alert/10'
            }`}
          >
            {deleteLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Trash2 size={14} />
            )}
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="p-4 bg-alert/10 border border-alert/20 rounded-2xl flex items-center justify-between text-alert text-sm font-medium animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button 
            onClick={() => setDeleteError(null)}
            className="text-xs font-bold hover:underline shrink-0 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Profile */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-20 h-20 bg-ear/20 text-deep rounded-2xl flex items-center justify-center border border-utility shadow-sm shrink-0">
          <Package size={36} />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <BrandBadge variant="neutral">
              {categoryName}
            </BrandBadge>
            {product.sku && (
              <span className="text-xs font-mono text-slate bg-surface px-2.5 py-0.5 rounded-md border border-utility">
                SKU: {product.sku}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-deep tracking-tight">
            {product.name}
          </h1>
          <p className="text-slate font-semibold text-xs uppercase tracking-wider">{product.brand || 'Unbranded'}</p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BrandCard hoverable className="p-6 flex items-center gap-5">
          <div className="w-13 h-13 bg-ear/20 text-deep rounded-xl flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate uppercase tracking-wider">Total Sales Revenue</span>
            <h3 className="text-2xl font-bold font-mono text-deep mt-0.5">${stats.totalRevenue.toFixed(2)}</h3>
          </div>
        </BrandCard>

        <BrandCard hoverable className="p-6 flex items-center gap-5">
          <div className="w-13 h-13 bg-memory/20 text-deep rounded-xl flex items-center justify-center">
            <Boxes size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate uppercase tracking-wider">Total Units Sold</span>
            <h3 className="text-2xl font-bold font-mono text-deep mt-0.5">
              {stats.totalUnits} <span className="text-xs text-slate font-medium uppercase">{product.unit_of_measure || 'units'}</span>
            </h3>
          </div>
        </BrandCard>

        <BrandCard hoverable className="p-6 flex items-center gap-5">
          <div className="w-13 h-13 bg-dark-accent/20 text-deep rounded-xl flex items-center justify-center">
            <StoreIcon size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate uppercase tracking-wider">Active Accounts</span>
            <h3 className="text-2xl font-bold font-mono text-deep mt-0.5">{stats.activeStoresCount}</h3>
          </div>
        </BrandCard>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns - Specifications and Stocking Stores */}
        <div className="lg:col-span-2 space-y-8">
          {/* Product Specs */}
          <BrandCard className="p-8 space-y-6">
            <h2 className="text-xl font-bold text-deep tracking-tight">Product Specifications</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">Unit Price</span>
                <span className="text-xl font-bold font-mono text-deep mt-1 block">${(product.price ?? 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">Unit of Measure</span>
                <span className="text-base font-semibold text-deep mt-1 block capitalize">{product.unit_of_measure || 'unit'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">Product Type</span>
                <span className="text-base font-semibold text-deep mt-1 block capitalize">{product.product_type || 'Standard'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">SKU / Code</span>
                <span className="text-base font-mono font-semibold text-deep mt-1 block">{product.sku || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">Brand</span>
                <span className="text-base font-semibold text-deep mt-1 block">{product.brand || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">External ID</span>
                <span className="text-base font-mono font-semibold text-deep mt-1 block">{product.external_id || '-'}</span>
              </div>

              {/* Dynamic Category-Scoped Custom Fields */}
              {product.custom_fields && Object.entries(product.custom_fields as Record<string, any>).map(([key, val]) => {
                if (val === undefined || val === null || val === '') return null;
                const fieldMeta = categoryFieldsMap[key];
                const label = fieldMeta ? fieldMeta.label : key.replace(/_/g, ' ');
                const displayVal = typeof val === 'boolean' 
                  ? (val ? 'Yes' : 'No') 
                  : Array.isArray(val) 
                    ? val.join(', ') 
                    : String(val);
                
                return (
                  <div key={key}>
                    <span className="text-[10px] font-bold text-slate uppercase tracking-wider block capitalize">{label}</span>
                    <span className="text-base font-semibold text-deep mt-1 block">{displayVal}</span>
                  </div>
                );
              })}
            </div>

            {product.description && (
              <div className="pt-6 border-t border-utility">
                <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-2">Description / Rep Guidelines</span>
                <p className="text-slate font-medium text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </BrandCard>

          {/* Accounts Stocking */}
          <BrandCard className="p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-utility">
              <h2 className="text-xl font-bold text-deep tracking-tight">Stocking Accounts</h2>
              <BrandBadge variant="neutral">
                <span className="font-mono">{stockingStores.length}</span> ACCOUNTS
              </BrandBadge>
            </div>

            {stockingStores.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <StoreIcon size={32} className="text-slate mb-3" />
                <p className="text-deep font-bold text-sm">No active stocking accounts found</p>
                <p className="text-slate text-xs mt-1">This product has not been included in any orders yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-utility text-[11px] font-bold text-slate uppercase tracking-wider">
                      <th className="pb-3">Account</th>
                      <th className="pb-3">Region</th>
                      <th className="pb-3 text-right">Units Ordered</th>
                      <th className="pb-3 text-right">Total Value</th>
                      <th className="pb-3 text-right">Last Purchase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-utility">
                    {stockingStores.map(store => (
                      <tr key={store.id} className="group hover:bg-surface/50 transition-colors">
                        <td className="py-3.5 pr-4">
                          <Link 
                            href={`/trade/entities/stores/${store.id}`}
                            className="font-bold text-deep hover:text-dark-accent transition-colors block text-sm"
                          >
                            {store.name}
                          </Link>
                          <span className="text-[11px] font-medium text-slate block mt-0.5 max-w-xs truncate">{store.address}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="bg-surface text-slate border border-utility px-2 py-0.5 rounded text-2xs font-semibold uppercase">
                            {store.region}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right font-bold font-mono text-deep text-sm">
                          {store.totalQty}
                        </td>
                        <td className="py-3.5 pr-4 text-right font-bold font-mono text-deep text-sm">
                          ${store.totalRevenue.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right font-mono text-slate text-xs">
                          {new Date(store.lastOrdered).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </BrandCard>
        </div>

        {/* Right Column - Order History */}
        <div className="space-y-8">
          <BrandCard className="p-8 space-y-6">
            <h2 className="text-xl font-bold text-deep tracking-tight pb-4 border-b border-utility">Order History</h2>
            
            {orderHistory.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <Package size={32} className="text-slate mb-3" />
                <p className="text-deep font-bold text-sm">No historical orders</p>
                <p className="text-slate text-xs mt-1">Rep orders featuring this product will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {orderHistory.map(order => (
                  <div key={order.id} className="p-4 bg-surface rounded-xl hover:border-dark-accent transition-colors border border-utility relative group">
                    <Link 
                      href={`/trade/operations/orders/${order.id}`}
                      className="absolute inset-0 z-0"
                    />
                    <div className="relative z-10 flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono text-slate uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <BrandBadge variant={order.status === 'delivered' ? 'confirmed' : order.status === 'pending' ? 'attention' : 'neutral'}>
                        {order.status}
                      </BrandBadge>
                    </div>

                    <h4 className="relative z-10 font-bold text-deep text-sm truncate group-hover:text-dark-accent transition-colors">
                      {order.storeName}
                    </h4>

                    <div className="relative z-10 flex justify-between items-end mt-3 pt-2.5 border-t border-utility/60">
                      <div>
                        <span className="text-[10px] font-medium text-slate block">Quantity</span>
                        <span className="font-mono font-semibold text-deep text-xs">
                          {order.quantityOrdered} × ${(order.unitPriceOrdered ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-medium text-slate block">Total</span>
                        <span className="font-bold font-mono text-deep text-sm">
                          ${order.itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BrandCard>
        </div>
      </div>
    </div>
  );
}
