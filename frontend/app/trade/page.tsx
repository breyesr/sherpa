'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  Store, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  MapPin, 
  ClipboardList,
  Plus,
  Search
} from 'lucide-react';

export default function TradeHubPage() {
  const token = useAuthStore((state) => state.token);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      // Note: We'll need to implement this endpoint or similar
      return [];
    },
    enabled: !!token,
  });

  const stats = [
    { name: 'Total Stores', value: '0', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Active Products', value: '0', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-5 py-3 rounded-2xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95">
            <Search size={18} className="text-gray-400" />
            Search
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
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
        {/* Store List Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <h3 className="font-bold text-xl text-gray-900">Your Stores</h3>
            <button className="text-blue-600 text-sm font-bold hover:underline bg-blue-50 px-4 py-1.5 rounded-full transition-colors">Manage All</button>
          </div>
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store size={32} />
            </div>
            <h4 className="text-lg font-bold text-gray-900">No Stores Found</h4>
            <p className="text-gray-500 text-sm font-medium mt-1">Start by adding your first retail location or retailer.</p>
            <button className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all">
              Initialize Trade Module
            </button>
          </div>
        </div>

        {/* Recent Dossiers */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
          <h3 className="font-bold text-xl text-gray-900 border-b border-gray-50 pb-4">Recent Dossiers</h3>
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={24} />
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No activity yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
