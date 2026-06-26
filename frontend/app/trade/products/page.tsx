'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  Package, 
  Tag, 
  Plus, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  ChevronRight, 
  Edit2, 
  LayoutGrid as CategoryIcon
} from 'lucide-react';
import { ProductResponse, CategoryResponse } from '@/types/api';
import CatalogDrawer from '@/components/v2/CatalogDrawer';

function ProductsPageContent() {
  const token = useAuthStore((state) => state.token);
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') === 'categories' ? 'categories' : 'products';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [catalogDrawer, setCatalogDrawer] = useState<{isOpen: boolean, mode: 'product' | 'category'}>({
    isOpen: false,
    mode: 'product'
  });

  // Fetch Products
  const { data: products = [], isLoading: loadingProducts } = useQuery<ProductResponse[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch Categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery<CategoryResponse[]>({
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

  // Create a mapping of category ID to category Name for fast lookup
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  // Search and Category Filter operations wrapped in useMemo to prevent keyboard lag
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const stats = [
    { name: 'Active SKUs', value: products.length.toString(), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Categories', value: categories.length.toString(), icon: CategoryIcon, color: 'text-blue-600', bg: 'bg-blue-50' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            Products
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg max-w-2xl">
            Browse and manage your B2B product catalog, active categories, and inventory items.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setCatalogDrawer({ isOpen: true, mode: 'category' })}
            className="flex items-center gap-2 bg-white text-gray-900 px-6 py-4 rounded-2xl text-sm font-bold border border-gray-200 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            <Plus size={16} />
            Add Category
          </button>
          <button 
            onClick={() => setCatalogDrawer({ isOpen: true, mode: 'product' })}
            className="flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-xl hover:bg-black transition-all active:scale-95"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => router.push('/trade/products?tab=products')}
          className={`px-8 py-4 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => router.push('/trade/products?tab=categories')}
          className={`px-8 py-4 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Categories
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
                <div className={`w-16 h-16 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                  <stat.icon size={28} />
                </div>
                <div>
                  <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{stat.name}</span>
                  <h3 className="text-3xl font-black text-gray-900 mt-1">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Control Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <select
                  className="w-full md:w-56 px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <ListIcon size={20} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={20} />
              </button>
            </div>
          </div>

          {/* Directory Content */}
          {loadingProducts || loadingCategories ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
              <span className="font-bold text-gray-500">Loading catalog items...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-[2rem] flex items-center justify-center mb-6">
                <Package size={36} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No products found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your search query or category filters.</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {/* Header Row */}
                <div className="hidden md:flex items-center justify-between p-8 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <div className="flex-1">Product Details</div>
                  <div className="w-48">Category</div>
                  <div className="w-32 text-right">Price</div>
                  <div className="w-32 text-right">UOM</div>
                  <div className="w-20"></div>
                </div>

                {/* Product Item List */}
                {filteredProducts.map((product) => (
                  <div key={product.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-8 hover:bg-gray-50/50 transition-all cursor-pointer">
                    <Link 
                      href={`/trade/products/${product.id}`}
                      className="absolute inset-0 z-0"
                    />
                    
                    <div className="relative z-10 flex items-center gap-6 pointer-events-none flex-1">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                        <Package size={28} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 mt-1 text-gray-500 font-medium">
                          {product.brand && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-semibold">
                              {product.brand}
                            </span>
                          )}
                          {product.sku && (
                            <span className="text-xs font-mono text-gray-400">
                              SKU: {product.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between md:justify-end gap-12 mt-6 md:mt-0 w-full md:w-auto">
                      <div className="w-48 pointer-events-none flex items-center">
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold">
                          {categoryMap[product.category_id] || 'Beverage'}
                        </span>
                      </div>
                      <div className="w-32 md:text-right font-black text-gray-900 text-lg pointer-events-none">
                        ${(product.price ?? 0).toFixed(2)}
                      </div>
                      <div className="w-32 md:text-right font-semibold text-gray-500 text-sm pointer-events-none uppercase">
                        {product.unit_of_measure || 'unit'}
                      </div>
                      <div className="w-20 flex justify-end">
                        <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="group relative bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all flex flex-col justify-between cursor-pointer"
                >
                  <Link 
                    href={`/trade/products/${product.id}`}
                    className="absolute inset-0 z-0"
                  />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                        <Package size={24} />
                      </div>
                      <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider">
                        {categoryMap[product.category_id] || 'Beverage'}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-900 group-hover:text-emerald-600 transition-all leading-tight truncate">
                      {product.name}
                    </h3>
                    <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-widest">{product.brand || 'No Brand'}</p>
                    
                    {product.sku && (
                      <p className="text-gray-400 text-xs font-mono mt-3">SKU: {product.sku}</p>
                    )}
                    
                    {product.description && (
                      <p className="text-gray-500 text-sm mt-4 line-clamp-2">{product.description}</p>
                    )}
                  </div>

                  <div className="relative z-10 flex items-center justify-between mt-8 pt-6 border-t border-gray-50">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Unit Price</span>
                      <span className="text-2xl font-black text-gray-900">${(product.price ?? 0).toFixed(2)}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg">
                      {product.unit_of_measure || 'unit'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Categories View */
        loadingCategories ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
            <span className="font-bold text-gray-500">Loading categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-[2rem] flex items-center justify-center mb-6">
              <Tag size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No categories found</h3>
            <p className="text-gray-500 mt-2">Create your first product category to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              <div className="hidden md:flex items-center justify-between p-8 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <div className="flex-1">Category Name</div>
                <div className="w-64">Type / Classification</div>
                <div className="w-64">Description</div>
              </div>
              {categories.map((cat) => (
                <div key={cat.id} className="flex flex-col md:flex-row md:items-center justify-between p-8 hover:bg-gray-50/50 transition-all">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                      <Tag size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">
                        {cat.name}
                      </h3>
                    </div>
                  </div>
                  <div className="w-64 text-sm font-bold text-gray-600 uppercase tracking-wider">
                    {cat.category_type || 'General'}
                  </div>
                  <div className="w-64 text-sm font-medium text-gray-500">
                    {cat.description || 'No description provided.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Catalog Creation Drawer */}
      <CatalogDrawer 
        isOpen={catalogDrawer.isOpen}
        onClose={() => setCatalogDrawer(prev => ({ ...prev, isOpen: false }))}
        token={token}
        initialMode={catalogDrawer.mode}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
        <span className="font-bold text-gray-500">Loading catalog...</span>
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
