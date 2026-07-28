'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  ChevronLeft, 
  Package, 
  Tag, 
  Barcode, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Store as StoreIcon, 
  Calendar, 
  Edit2, 
  Trash2, 
  Loader2, 
  AlertCircle,
  FileText,
  Boxes
} from 'lucide-react';
import { components } from '@/types/api';

type ProductResponse = components['schemas']['ProductResponse'];
type StoreResponse = components['schemas']['StoreResponse'];
type OrderResponse = components['schemas']['OrderResponse'];
type CategoryResponse = components['schemas']['CategoryResponse'];
import CatalogDrawer from '@/components/v2/CatalogDrawer';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch Product details
  const { data: product, isLoading: loadingProduct, error: productError } = useQuery<ProductResponse>({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/products/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Product not found');
      return res.json();
    },
    enabled: !!token && !!id,
  });

  // Fetch Stores
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

  // Fetch Categories
  const { data: categories = [] } = useQuery<CategoryResponse[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Orders
  const { data: orders = [] } = useQuery<OrderResponse[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  // Category map for fast lookup
  const categoryName = useMemo(() => {
    if (!product || categories.length === 0) return 'Beverage';
    const cat = categories.find(c => c.id === product.category_id);
    return cat ? cat.name : 'Beverage';
  }, [product, categories]);

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
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trade/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to delete product');
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/trade/products');
    } catch (err) {
      console.error(err);
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-gray-900" size={48} />
        <span className="font-bold text-gray-500">Loading Product Specifications...</span>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="max-w-4xl mx-auto p-12 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900">Product not found</h3>
        <p className="text-gray-500 mt-2">The product might have been deleted, or there was a network connection error.</p>
        <Link 
          href="/trade/products"
          className="inline-flex items-center gap-2 mt-6 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-black transition-all"
        >
          <ChevronLeft size={16} /> Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Back & Actions Navigation */}
      <div className="flex justify-between items-center">
        <Link 
          href="/trade/products"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={18} />
          Back to Catalog
        </Link>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 bg-white text-gray-700 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            <Edit2 size={14} />
            Edit Product
          </button>
          <button 
            onClick={handleDelete}
            disabled={deleteLoading}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border ${
              confirmDelete 
                ? 'bg-red-600 text-white border-red-600 animate-pulse hover:bg-red-700' 
                : 'bg-white text-red-600 border-red-100 hover:bg-red-50'
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

      {/* Header Profile */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
          <Package size={44} />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold">
              {categoryName}
            </span>
            {product.sku && (
              <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                SKU: {product.sku}
              </span>
            )}
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-none">
            {product.name}
          </h1>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">{product.brand || 'Unbranded'}</p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <DollarSign size={28} />
          </div>
          <div>
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Sales Revenue</span>
            <h3 className="text-3xl font-black text-gray-900 mt-1">${stats.totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Boxes size={28} />
          </div>
          <div>
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Units Sold</span>
            <h3 className="text-3xl font-black text-gray-900 mt-1">
              {stats.totalUnits} <span className="text-sm text-gray-400 font-bold uppercase">{product.unit_of_measure || 'units'}</span>
            </h3>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <StoreIcon size={28} />
          </div>
          <div>
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Active Accounts</span>
            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.activeStoresCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Specifications and Stocking Stores */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Product Specs */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Product Specifications</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Unit Price</span>
                <span className="text-xl font-black text-gray-900 mt-1 block">${(product.price ?? 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Unit of Measure</span>
                <span className="text-lg font-bold text-gray-700 mt-1 block capitalize">{product.unit_of_measure || 'unit'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Product Type</span>
                <span className="text-lg font-bold text-gray-700 mt-1 block capitalize">{product.product_type || 'Standard'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">SKU / Code</span>
                <span className="text-lg font-mono font-bold text-gray-700 mt-1 block">{product.sku || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Brand</span>
                <span className="text-lg font-bold text-gray-700 mt-1 block">{product.brand || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">External ID</span>
                <span className="text-lg font-mono font-bold text-gray-700 mt-1 block">{product.external_id || '-'}</span>
              </div>
            </div>

            {product.description && (
              <div className="pt-6 border-t border-gray-50">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Description / Rep Guidelines</span>
                <p className="text-gray-600 font-medium text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </div>

          {/* Accounts Stocking */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Stocking Accounts</h2>
              <span className="text-xs bg-gray-50 text-gray-500 px-3 py-1 rounded-full font-bold border border-gray-100">
                {stockingStores.length} Accounts stocking
              </span>
            </div>

            {stockingStores.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <StoreIcon size={36} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-bold">No active stocking accounts found</p>
                <p className="text-gray-400 text-xs mt-1">This product has not been included in any orders yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="pb-4">Account</th>
                      <th className="pb-4">Region</th>
                      <th className="pb-4 text-right">Units Ordered</th>
                      <th className="pb-4 text-right">Total Value</th>
                      <th className="pb-4 text-right">Last Purchase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stockingStores.map(store => (
                      <tr key={store.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pr-4">
                          <Link 
                            href={`/trade/stores/${store.id}`}
                            className="font-black text-gray-900 hover:text-blue-600 transition-colors block text-sm"
                          >
                            {store.name}
                          </Link>
                          <span className="text-[10px] font-bold text-gray-400 block mt-0.5 max-w-xs truncate">{store.address}</span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-2xs font-semibold uppercase">
                            {store.region}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-right font-black text-gray-900 text-sm">
                          {store.totalQty}
                        </td>
                        <td className="py-4 pr-4 text-right font-black text-gray-900 text-sm">
                          ${store.totalRevenue.toFixed(2)}
                        </td>
                        <td className="py-4 text-right font-bold text-gray-500 text-xs">
                          {new Date(store.lastOrdered).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order History */}
        <div className="space-y-8">
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order History</h2>
            
            {orderHistory.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <ShoppingBag size={36} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-bold">No historical orders</p>
                <p className="text-gray-400 text-xs mt-1">Rep orders featuring this product will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {orderHistory.map(order => (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100/70 transition-colors border border-gray-100 relative group">
                    <Link 
                      href={`/trade/orders/${order.id}`}
                      className="absolute inset-0 z-0"
                    />
                    <div className="relative z-10 flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`text-2xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <h4 className="relative z-10 font-black text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                      {order.storeName}
                    </h4>

                    <div className="relative z-10 flex justify-between items-end mt-4 pt-3 border-t border-gray-200/50">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block">Quantity</span>
                        <span className="font-black text-gray-700 text-xs">
                          {order.quantityOrdered} × ${(order.unitPriceOrdered ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 block">Total</span>
                        <span className="font-black text-gray-900 text-sm">
                          ${order.itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Drawer */}
      <CatalogDrawer 
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        token={token}
        productId={product.id}
        initialData={product}
      />
    </div>
  );
}
