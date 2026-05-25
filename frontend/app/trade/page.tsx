'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  Store as StoreIcon, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  MapPin, 
  Plus,
  Search,
  ChevronRight,
  Phone,
  LayoutGrid,
  ClipboardList
} from 'lucide-react';
import StoreModal from '@/components/StoreModal';
import AddCategoryModal from '@/components/AddCategoryModal';
import AddProductModal from '@/components/AddProductModal';

export default function TradeHubPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  
  // Modal States
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Fetch Stores
  const { data: stores = [], isLoading: loadingStores } = useQuery({
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
  const { data: categories = [] } = useQuery({
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
  const { data: products = [] } = useQuery({
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
    { name: 'Total Stores', value: stores.length.toString(), icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Active Products', value: products.length.toString(), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Pending Orders', value: '0', icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Competitors', value: '0', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Trade Hub
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-tighter">BETA</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg">Manage your field operations, inventory, and stores.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95">
              <LayoutGrid size={18} className="text-gray-400" />
              Manage Inventory
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button 
                onClick={() => setIsAddCategoryOpen(true)}
                className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
              >
                <Plus size={14} /> New Category
              </button>
              <button 
                onClick={() => setIsAddProductOpen(true)}
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
          <div key={stat.name} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-3xl font-black text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{stat.name}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Store List */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <h3 className="font-bold text-xl text-gray-900">Your Stores</h3>
            <button className="text-blue-600 text-sm font-bold hover:underline bg-blue-50 px-4 py-1.5 rounded-full transition-colors">Manage All</button>
          </div>
          
          {loadingStores ? (
            <div className="p-16 text-center animate-pulse text-gray-400 font-bold">Loading stores...</div>
          ) : stores.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stores.map((store: any) => (
                <div key={store.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-blue-200 group-hover:text-blue-500 transition-all">
                      <StoreIcon size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900 line-clamp-1">{store.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><MapPin size={14} className="text-gray-400" /> {store.address || 'No address'}</span>
                        {store.contact_phone && <span className="flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {store.contact_phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {store.external_id && (
                      <span className="text-[10px] font-black font-mono bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">
                        {store.external_id}
                      </span>
                    )}
                    <Link 
                      href={`/trade/stores/${store.id}`}
                      className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                    >
                      <ChevronRight size={20} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <StoreIcon size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-900">No Stores Found</h4>
              <p className="text-gray-500 text-sm font-medium mt-1">Start by adding your first retail location or retailer.</p>
              <button 
                onClick={() => setIsAddStoreOpen(true)}
                className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
              >
                Add Your First Store
              </button>
            </div>
          )}
        </div>

        {/* Recent Dossiers / Categories */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-50 pb-4">
            <h3 className="font-bold text-xl text-gray-900">Categories</h3>
            <button 
              onClick={() => setIsAddCategoryOpen(true)}
              className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest"
            >
              Add New
            </button>
          </div>
          
          {categories.length > 0 ? (
            <div className="space-y-3">
              {categories.map((cat: any) => (
                <div key={cat.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-blue-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 group-hover:text-blue-500 shadow-sm">
                      <LayoutGrid size={16} />
                    </div>
                    <span className="font-bold text-sm text-gray-700">{cat.name}</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-300" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutGrid size={24} />
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">No categories<br/>defined yet</p>
            </div>
          )}
          
          <div className="pt-4 border-t border-gray-50">
            <button 
              onClick={() => setIsAddProductOpen(true)}
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

      <AddCategoryModal 
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }}
        token={token}
      />

      <AddProductModal 
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }}
        token={token}
      />
    </div>
  );
}
