'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
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
  LayoutGrid as CategoryIcon,
  Trash2,
  Layers,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { components } from '@/types/api';

type ProductResponse = components['schemas']['ProductResponse'];
type CategoryResponse = components['schemas']['CategoryResponse'];
import { useDrawerStore } from '@/lib/store/DrawerManager';

function ProductsPageContent() {
  const token = useAuthStore((state) => state.token);
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeTab = searchParams.get('tab') === 'categories' ? 'categories' : 'products';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryResponse | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingCat, setDeletingCat] = useState(false);

  // Fetch Products
  const { data: products = [], isLoading: loadingProducts } = useQuery<ProductResponse[]>({
    queryKey: ['products'],
    queryFn: async () => {
      return await apiClient.get<ProductResponse[]>('/trade/products');
    },
    enabled: !!token,
  });

  // Fetch Categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery<CategoryResponse[]>({
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

  // Fetch Business Profile
  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      try {
        return await apiClient.get<any>('/business/me');
      } catch {
        return null;
      }
    },
    enabled: !!token,
  });

  const isB2C = business?.vertical_type === 'BASIC';

  // Create a mapping of category ID to category Name for fast lookup
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  // Real-time product count per category based on active product inventory
  const getCategoryProductCount = (category: CategoryResponse) => {
    if (products && products.length > 0) {
      return products.filter(p => p.category_id === category.id).length;
    }
    return (category as any).product_count ?? 0;
  };

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
            {isB2C 
              ? "Browse and manage your retail product catalog, active categories, and catalog listings."
              : "Browse and manage your B2B product catalog, active categories, and inventory items."}
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => openDrawer('category')}
            className="flex items-center gap-2 bg-white text-gray-900 px-6 py-4 rounded-2xl text-sm font-bold border border-gray-200 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            <Plus size={16} />
            Add Category
          </button>
          <button 
            onClick={() => openDrawer('catalog', { initialMode: 'product' })}
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
                          {!isB2C && product.brand && (
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
                          {categoryMap[product.category_id] || 'General'}
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
                        {categoryMap[product.category_id] || 'General'}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-900 group-hover:text-emerald-600 transition-all leading-tight truncate">
                      {product.name}
                    </h3>
                    {!isB2C && (
                      <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-widest">{product.brand || 'No Brand'}</p>
                    )}
                    
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
          <div className="space-y-4">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                <div className="hidden md:flex items-center justify-between p-8 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <div className="flex-1">Category & Details</div>
                  <div className="w-48 text-center">Products</div>
                  <div className="w-80">Product Attributes Template</div>
                  <div className="w-32 text-right">Actions</div>
                </div>
                {categories.map((cat) => {
                  const fields = Array.isArray(cat.fields_config) ? (cat.fields_config as any[]) : [];
                  const pCount = getCategoryProductCount(cat);

                  return (
                    <div key={cat.id} className="flex flex-col md:flex-row md:items-center justify-between p-8 hover:bg-gray-50/50 transition-all gap-6">
                      {/* Name, Type & Description */}
                      <div className="flex items-start gap-5 flex-1">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                          <Tag size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black text-gray-900">
                              {cat.name}
                            </h3>
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-2xs font-bold uppercase tracking-wider">
                              {(cat as any).category_type || 'General'}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-sm font-medium text-gray-500 mt-1 line-clamp-2">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Products Count */}
                      <div className="w-48 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold">
                          <Package size={14} className="text-gray-400" />
                          {pCount} {pCount === 1 ? 'Product' : 'Products'}
                        </span>
                      </div>

                      {/* Custom Specifications Chips */}
                      <div className="w-80">
                        {fields.length === 0 ? (
                          <span className="text-xs text-gray-400 font-medium italic">
                            No custom attributes
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                            {fields.map((f: any, idx: number) => (
                              <span 
                                key={f.key || idx} 
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-2xs font-bold flex items-center gap-1"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {f.label || f.key}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Edit & Delete Actions */}
                      <div className="w-32 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDrawer('category', { category: cat })}
                          className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all"
                          title="Edit Category & Attributes"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setDeleteError('');
                          }}
                          className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all"
                          title="Delete Category"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (() => {
        const catToDeleteProductCount = getCategoryProductCount(categoryToDelete);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  catToDeleteProductCount > 0 
                    ? 'bg-amber-50 text-amber-600' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {catToDeleteProductCount > 0 
                      ? 'Cannot Delete Category' 
                      : 'Delete Category'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Category: <span className="font-bold text-gray-700">{categoryToDelete.name}</span>
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-medium">
                  {deleteError}
                </div>
              )}

              {catToDeleteProductCount > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    This category currently contains <strong className="text-gray-900 font-bold">{catToDeleteProductCount} product(s)</strong>. To protect catalog integrity, you must reassign or delete these products before this category can be removed.
                  </p>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(null)}
                      className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all"
                    >
                      Understood
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    Are you sure you want to delete this category? All category configurations and specifications will be permanently removed.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(null)}
                      disabled={deletingCat}
                      className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deletingCat}
                      onClick={async () => {
                        setDeletingCat(true);
                        setDeleteError('');
                        try {
                          await apiClient.delete(`/trade/categories/${categoryToDelete.id}`);
                          await queryClient.invalidateQueries({ queryKey: ['categories'] });
                          await queryClient.invalidateQueries({ queryKey: ['products'] });
                          setCategoryToDelete(null);
                        } catch (err: unknown) {
                          setDeleteError(err instanceof Error ? err.message : 'Failed to delete category');
                        } finally {
                          setDeletingCat(false);
                        }
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {deletingCat ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      Delete Category
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
