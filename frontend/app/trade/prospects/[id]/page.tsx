'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
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
  Users
} from 'lucide-react';
import { StoreResponse, OrderResponse, ProductResponse } from '@/types/api';

type TabType = 'details' | 'products' | 'orders';

export default function ProspectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  // Fetch Store Detail
  const { data: store, isLoading } = useQuery<StoreResponse>({
    queryKey: ['store', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Prospect not found');
      return res.json();
    },
    enabled: !!token && !!id,
  });

  // Fetch Store Orders
  const { data: orders = [] } = useQuery<OrderResponse[]>({
    queryKey: ['orders', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/orders?store_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && !!id,
  });

  // Fetch Products (Global catalog)
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

  if (isLoading || !token) return <div className="p-20 text-center font-bold text-gray-400">Loading Prospect Intelligence...</div>;
  if (!store) return <div className="p-20 text-center font-bold text-red-500">Prospect not found or connection error.</div>;

  const isSystemGenerated = store.name.toLowerCase().startsWith('prospect');
  const hasClientName = store.clients && store.clients[0]?.name;
  const displayTitle = isSystemGenerated && hasClientName ? store.clients[0].name : store.name;

  const totalOrderValue = orders.reduce((sum, order) => sum + order.total_amount, 0);

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Link
          href={store.prospect_segment === 'retail' ? '/trade/prospects/accounts?segment=retail' : '/trade/prospects/accounts?segment=wholesale'}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-all" />
          Back to Prospects
        </Link>
        <button
          onClick={async () => {
            if (confirm(`Are you sure you want to delete prospect account ${store.name}?`)) {
              try {
                const res = await fetch(`${API_BASE_URL}/trade/stores/${store.id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                  router.push(store.prospect_segment === 'retail' ? '/trade/prospects/accounts?segment=retail' : '/trade/prospects/accounts?segment=wholesale');
                } else {
                  alert('Failed to delete prospect account');
                }
              } catch (err) {
                alert('Error deleting prospect account');
              }
            }
          }}
          className="flex items-center gap-2 text-red-600 hover:text-red-800 font-bold transition-all bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl text-sm"
        >
          <Trash2 size={16} />
          Delete Prospect Account
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative flex flex-col lg:flex-row justify-between gap-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-200 shrink-0">
              <StoreIcon size={48} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-100">
                  UNVERIFIED ACCOUNT
                </span>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-gray-200">
                  {store.segment || 'General'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
                {displayTitle}
              </h1>
              <div className="flex flex-col md:flex-row md:items-center gap-6 text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-blue-500" />
                  <span>{store.address || 'No address registered'}</span>
                </div>
                {store.region && (
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-orange-500" />
                    <span>Region: {store.region}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:flex gap-4 items-center flex-wrap">
            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 min-w-[140px]">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Total Value</span>
              <span className="text-2xl font-black text-gray-900">${totalOrderValue.toLocaleString()}</span>
              <div className="flex items-center gap-1 text-green-600 text-[10px] font-bold mt-1">
                <TrendingUp size={12} /> {orders.length} Orders
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 min-w-[140px]">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Avg. Ticket</span>
              <span className="text-2xl font-black text-gray-900">
                ${orders.length > 0 ? (totalOrderValue / orders.length).toFixed(0) : '0'}
              </span>
              <div className="flex items-center gap-1 text-blue-600 text-[10px] font-bold mt-1">
                <ShoppingBag size={12} /> Per Order
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 min-h-[400px]">
          {activeTab === 'details' && (
            <div className="space-y-12">
              <section>
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <FileText size={20} className="text-blue-500" />
                  General Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InfoItem label="Full Name" value={store.clients?.[0]?.name || 'No Contact'} icon={Users} />
                  <InfoItem label="Physical Address" value={store.address || 'Not specified'} icon={MapPin} />
                  <InfoItem label="Phone Number" value={store.clients?.[0]?.phone || store.phone || 'Not available'} icon={Phone} />
                  <InfoItem label="Email Address" value={store.clients?.[0]?.email || store.email || 'Not available'} icon={Mail} />
                </div>
              </section>

              <section className="pt-8 border-t border-gray-50">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Target size={20} className="text-orange-500" />
                  Market Context
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Market</span>
                    <span className="font-bold text-gray-400 text-lg">Unassigned</span>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Segment</span>
                    <span className="font-bold text-gray-900 text-lg">{store.segment || 'General'}</span>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Region</span>
                    <span className="font-bold text-gray-900 text-lg">{store.region || 'Unknown'}</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-gray-900 mb-4">Product Portfolio</h3>
              {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-400 font-bold uppercase">{product.sku || 'No SKU'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900">${product.price.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{product.unit_of_measure || 'unit'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Package className="text-gray-300 mb-4" size={32} />
                  <p className="text-gray-500 font-bold">No products in catalog.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-gray-900 mb-4">Order History</h3>
              {orders.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {orders.map((order) => (
                    <div key={order.id} className="py-6 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                          <ShoppingBag size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-400 font-bold uppercase">
                            {new Date(order.created_at).toLocaleDateString()} • {order.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900 text-lg">${order.total_amount.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{order.items.length} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ShoppingBag className="text-gray-300 mb-4" size={32} />
                  <p className="text-gray-500 font-bold">No orders recorded for this account.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }: any) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">{label}</span>
        <span className="font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
}
