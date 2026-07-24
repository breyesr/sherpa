'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  MapPin, 
  Plus,
  ChevronRight,
  LayoutGrid,
  ClipboardList
} from 'lucide-react';
import StoreModal from '@/components/StoreModal';
import CatalogDrawer from '@/components/v2/CatalogDrawer';
import OrderDrawer from '@/components/v2/OrderDrawer';
import { components } from '@/types/api';

type StoreResponse = components['schemas']['StoreResponse'];
type CategoryResponse = components['schemas']['CategoryResponse'];
type ProductResponse = components['schemas']['ProductResponse'];

export default function TradeHubPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  // Drawer/Modal States
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [catalogDrawer, setCatalogDrawer] = useState<{isOpen: boolean, mode: 'product' | 'category'}>({
    isOpen: false,
    mode: 'product'
  });

  // Fetch Stores
  const { data: stores = [] } = useQuery<StoreResponse[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stores');
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

  // Fetch Products
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

  const stats = [
    { name: 'Total Stores', value: stores.length.toString(), icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', link: '/trade/stores' },
    { name: 'Active Products', value: products.length.toString(), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '#' },
    { name: 'Pending Orders', value: '0', icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50', link: '#' },
    { name: 'Trade Retailers', value: '...', icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50', link: '/trade/retailers' },
  ];

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Trade Hub
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-tighter">Pulse</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">Central nervous system for your field operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOrderDrawerOpen(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95"
          >
            <ShoppingCart size={18} />
            New Order
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95">
              <LayoutGrid size={18} className="text-gray-400" />
              Manage Inventory
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button 
                onClick={() => setCatalogDrawer({ isOpen: true, mode: 'category' })}
                className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus size={14} /> New Category
              </button>
              <button 
                onClick={() => setCatalogDrawer({ isOpen: true, mode: 'product' })}
                className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus size={14} /> New Product
              </button>
            </div>
          </div>
          <button 
            onClick={() => setIsAddStoreOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={18} />
            Add Store
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link href={stat.link} key={stat.name} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group block">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{stat.name}</p>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 mb-1" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity / Observations */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-2xl text-gray-900 flex items-center gap-2">
                <TrendingUp size={24} className="text-blue-500" />
                Recent Observations
              </h3>
              <Link href="/trade/stores" className="text-blue-600 text-sm font-bold hover:underline bg-blue-50 px-4 py-1.5 rounded-full">View All Stores</Link>
            </div>

            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                <ClipboardList size={32} />
              </div>
              <p className="text-gray-400 font-medium max-w-xs mx-auto">No recent observations found. Notes recorded during field visits will appear here.</p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
               <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                <Package size={20} className="text-emerald-500" />
                Product Pulse
              </h3>
              <p className="text-gray-400 text-sm font-medium italic">Detailed restock intelligence coming soon.</p>
            </section>
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
               <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                <ShoppingCart size={20} className="text-amber-500" />
                Sales Velocity
              </h3>
              <p className="text-gray-400 text-sm font-medium italic">Transactional insights coming soon.</p>
            </section>
          </div>
        </div>

        {/* Categories Sidebar (Simplified) */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <h3 className="font-bold text-xl text-gray-900">Categories</h3>
            <button 
              onClick={() => setCatalogDrawer({ isOpen: true, mode: 'category' })}
              className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest"
            >
              Add New
            </button>
          </div>
          
          {categories.length > 0 ? (
            <div className="space-y-3">
              {categories.slice(0, 5).map((cat) => (
                <div key={cat.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-blue-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 group-hover:text-blue-500 shadow-sm">
                      <LayoutGrid size={16} />
                    </div>
                    <span className="font-bold text-sm text-gray-700">{cat.name}</span>
                  </div>
                </div>
              ))}
              {categories.length > 5 && (
                <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest pt-2">+{categories.length - 5} more</p>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 text-xs font-bold">No categories defined.</div>
          )}
          
          <div className="pt-4 border-t border-gray-50">
            <button 
              onClick={() => setCatalogDrawer({ isOpen: true, mode: 'product' })}
              className="w-full py-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
            >
              <Package size={18} /> Add New Product
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StoreModal 
        isOpen={isAddStoreOpen}
        onClose={() => setIsAddStoreOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['stores'] });
        }}
        token={token}
      />

      <CatalogDrawer 
        isOpen={catalogDrawer.isOpen}
        onClose={() => setCatalogDrawer({ ...catalogDrawer, isOpen: false })}
        token={token}
        initialMode={catalogDrawer.mode}
      />

      <OrderDrawer 
        isOpen={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        token={token}
      />
    </div>
  );
}
