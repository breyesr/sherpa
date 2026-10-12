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
  Trash2, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react';
import { components } from '@/types/api';
import { useDrawerStore } from '@/lib/store/DrawerManager';
import { BrandCard, BrandButton, BrandBadge } from '@/components/ui/brand';

type ProductResponse = components['schemas']['ProductResponse'];
type CategoryResponse = components['schemas']['CategoryResponse'];

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
        return await apiClient.get<{ vertical_type?: string }>('/business/me');
      } catch {
        return null;
      }
    },
    enabled: !!token,
  });

  const isB2C = business?.vertical_type === 'BASIC';

  // Create mapping of category ID to category Name for fast lookup
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  // Real-time product count per category
  const getCategoryProductCount = (category: CategoryResponse) => {
    if (products && products.length > 0) {
      return products.filter(p => p.category_id === category.id).length;
    }
    return (category as any).product_count ?? 0;
  };

  // Search and Category Filter operations
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-deep tracking-tight">
              Catalog & Inventory
            </h1>
            <BrandBadge variant="accent">
              <span className="font-mono">{products.length}</span> SKUS
            </BrandBadge>
          </div>
          <p className="text-slate mt-1.5 font-medium text-base max-w-2xl">
            {isB2C 
              ? "Browse and manage your retail product catalog, active categories, and catalog listings."
              : "Browse and manage your B2B product catalog, active categories, and inventory items."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BrandButton 
            variant="secondary"
            onClick={() => openDrawer('category')}
          >
            <Plus size={16} />
            Add Category
          </BrandButton>
          <BrandButton 
            variant="primary"
            onClick={() => openDrawer('catalog', { initialMode: 'product' })}
          >
            <Plus size={16} />
            Add Product
          </BrandButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-utility">
        <button
          onClick={() => router.push('/trade/catalog/products?tab=products')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'products'
              ? 'border-dark-accent text-deep'
              : 'border-transparent text-slate hover:text-deep'
          }`}
        >
          <Package size={16} />
          Products ({products.length})
        </button>
        <button
          onClick={() => router.push('/trade/catalog/products?tab=categories')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'border-dark-accent text-deep'
              : 'border-transparent text-slate hover:text-deep'
          }`}
        >
          <Tag size={16} />
          Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BrandCard hoverable className="p-6 flex items-center gap-6">
              <div className="w-14 h-14 bg-ear/20 text-deep rounded-2xl flex items-center justify-center">
                <Package size={26} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate uppercase tracking-wider">Active SKUs</span>
                <h3 className="text-3xl font-bold font-mono text-deep mt-0.5">{products.length}</h3>
              </div>
            </BrandCard>
            <BrandCard hoverable className="p-6 flex items-center gap-6">
              <div className="w-14 h-14 bg-memory/20 text-deep rounded-2xl flex items-center justify-center">
                <Tag size={26} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate uppercase tracking-wider">Defined Categories</span>
                <h3 className="text-3xl font-bold font-mono text-deep mt-0.5">{categories.length}</h3>
              </div>
            </BrandCard>
          </div>

          {/* Control Bar */}
          <BrandCard className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" size={16} />
                <input 
                  type="text"
                  placeholder="Search products by SKU, name, or brand..."
                  className="w-full pl-11 pr-4 py-2.5 bg-surface border border-utility rounded-xl focus:outline-none focus:ring-2 focus:ring-dark-accent text-sm font-medium text-deep"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <select
                  className="w-full md:w-56 px-4 py-2.5 bg-surface border border-utility rounded-xl focus:outline-none focus:ring-2 focus:ring-dark-accent text-sm font-semibold text-deep appearance-none cursor-pointer"
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
            
            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-utility">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-canvas shadow-sm text-deep' : 'text-slate hover:text-deep'}`}
                title="List View"
              >
                <ListIcon size={18} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-canvas shadow-sm text-deep' : 'text-slate hover:text-deep'}`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </BrandCard>

          {/* Directory Content */}
          {loadingProducts || loadingCategories ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-dark-accent border-t-transparent"></div>
              <span className="font-semibold text-slate text-sm">Loading catalog items...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <BrandCard className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface text-slate rounded-2xl flex items-center justify-center mb-4 border border-utility">
                <Package size={32} />
              </div>
              <h3 className="text-lg font-bold text-deep">No products found</h3>
              <p className="text-slate text-sm mt-1">Try adjusting your search query or category filters.</p>
            </BrandCard>
          ) : viewMode === 'list' ? (
            <BrandCard className="overflow-hidden">
              <div className="divide-y divide-utility">
                {/* Header Row */}
                <div className="hidden md:flex items-center justify-between p-5 bg-surface/50 text-[11px] font-bold text-slate uppercase tracking-wider border-b border-utility">
                  <div className="flex-1">Product Details</div>
                  <div className="w-48">Category</div>
                  <div className="w-32 text-right">Price</div>
                  <div className="w-32 text-right">UOM</div>
                  <div className="w-16"></div>
                </div>

                {/* Product Item List */}
                {filteredProducts.map((product) => (
                  <div key={product.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-surface/50 transition-colors cursor-pointer">
                    <Link 
                      href={`/trade/catalog/products/${product.id}`}
                      className="absolute inset-0 z-0"
                    />
                    
                    <div className="relative z-10 flex items-center gap-5 pointer-events-none flex-1">
                      <div className="w-12 h-12 bg-ear/20 text-deep rounded-xl flex items-center justify-center group-hover:bg-ear/40 transition-colors shadow-sm">
                        <Package size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-deep group-hover:text-dark-accent transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-slate text-xs font-medium">
                          {!isB2C && product.brand && (
                            <span className="bg-surface text-slate border border-utility px-2 py-0.5 rounded font-medium">
                              {product.brand}
                            </span>
                          )}
                          {product.sku && (
                            <span className="font-mono text-slate">
                              SKU: {product.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between md:justify-end gap-8 mt-4 md:mt-0 w-full md:w-auto">
                      <div className="w-48 pointer-events-none flex items-center">
                        <BrandBadge variant="neutral">
                          {categoryMap[product.category_id] || 'General'}
                        </BrandBadge>
                      </div>
                      <div className="w-32 md:text-right font-bold font-mono text-deep text-base pointer-events-none">
                        ${(product.price ?? 0).toFixed(2)}
                      </div>
                      <div className="w-32 md:text-right font-medium text-slate text-xs pointer-events-none uppercase">
                        {product.unit_of_measure || 'unit'}
                      </div>
                      <div className="w-16 flex justify-end">
                        <ChevronRight size={18} className="text-slate group-hover:text-deep group-hover:translate-x-1 transition-all pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BrandCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <BrandCard 
                  key={product.id} 
                  hoverable
                  className="p-6 flex flex-col justify-between cursor-pointer relative group"
                >
                  <Link 
                    href={`/trade/catalog/products/${product.id}`}
                    className="absolute inset-0 z-0"
                  />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-ear/20 text-deep rounded-xl flex items-center justify-center group-hover:bg-ear/40 transition-colors shadow-sm">
                        <Package size={22} />
                      </div>
                      <BrandBadge variant="neutral">
                        {categoryMap[product.category_id] || 'General'}
                      </BrandBadge>
                    </div>
                    
                    <h3 className="text-lg font-bold text-deep group-hover:text-dark-accent transition-colors truncate">
                      {product.name}
                    </h3>
                    {!isB2C && (
                      <p className="text-slate font-medium text-xs mt-1 uppercase tracking-wider">{product.brand || 'No Brand'}</p>
                    )}
                    
                    {product.sku && (
                      <p className="text-slate text-xs font-mono mt-2">SKU: {product.sku}</p>
                    )}
                    
                    {product.description && (
                      <p className="text-slate text-sm mt-3 line-clamp-2">{product.description}</p>
                    )}
                  </div>

                  <div className="relative z-10 flex items-center justify-between mt-6 pt-4 border-t border-utility">
                    <div>
                      <span className="text-[10px] font-bold text-slate uppercase tracking-wider block">Price</span>
                      <span className="text-xl font-bold font-mono text-deep">${(product.price ?? 0).toFixed(2)}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate uppercase bg-surface border border-utility px-2.5 py-1 rounded-lg">
                      {product.unit_of_measure || 'unit'}
                    </span>
                  </div>
                </BrandCard>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Categories View */
        loadingCategories ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-dark-accent border-t-transparent"></div>
            <span className="font-semibold text-slate text-sm">Loading categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <BrandCard className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-surface text-slate rounded-2xl flex items-center justify-center mb-4 border border-utility">
              <Tag size={32} />
            </div>
            <h3 className="text-lg font-bold text-deep">No categories found</h3>
            <p className="text-slate text-sm mt-1">Create your first product category to get started.</p>
          </BrandCard>
        ) : (
          <div className="space-y-4">
            <BrandCard className="overflow-hidden">
              <div className="divide-y divide-utility">
                <div className="hidden md:flex items-center justify-between p-5 bg-surface/50 text-[11px] font-bold text-slate uppercase tracking-wider border-b border-utility">
                  <div className="flex-1">Category & Details</div>
                  <div className="w-48 text-center">Products</div>
                  <div className="w-80">Attributes Schema</div>
                  <div className="w-32 text-right">Actions</div>
                </div>
                {categories.map((cat) => {
                  const fields = Array.isArray(cat.fields_config) ? (cat.fields_config as any[]) : [];
                  const pCount = getCategoryProductCount(cat);

                  return (
                    <div key={cat.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-surface/50 transition-colors gap-6">
                      {/* Name, Type & Description */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-11 h-11 bg-memory/20 text-deep rounded-xl flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                          <Tag size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-deep">
                              {cat.name}
                            </h3>
                            <BrandBadge variant="neutral">
                              {(cat as any).category_type || 'General'}
                            </BrandBadge>
                          </div>
                          {cat.description && (
                            <p className="text-xs font-medium text-slate mt-1 line-clamp-2">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Products Count */}
                      <div className="w-48 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface border border-utility text-deep rounded-lg text-xs font-semibold font-mono">
                          <Package size={13} className="text-slate" />
                          {pCount} {pCount === 1 ? 'Product' : 'Products'}
                        </span>
                      </div>

                      {/* Custom Specifications Chips */}
                      <div className="w-80">
                        {fields.length === 0 ? (
                          <span className="text-xs text-slate font-medium italic">
                            No custom attributes
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                            {fields.map((f: any, idx: number) => (
                              <span 
                                key={f.key || idx} 
                                className="px-2.5 py-0.5 bg-surface text-deep border border-utility rounded-md text-2xs font-semibold flex items-center gap-1 font-mono"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-dark-accent" />
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
                          onClick={() => openDrawer('catalog', { categoryId: cat.id, initialData: cat })}
                          className="p-2 bg-surface hover:bg-canvas text-deep border border-utility rounded-lg text-xs font-semibold transition-colors"
                          title="Edit Category & Attributes"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setDeleteError('');
                          }}
                          className="p-2 bg-alert/10 hover:bg-alert/20 text-alert border border-alert/20 rounded-lg text-xs font-semibold transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </BrandCard>
          </div>
        )
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (() => {
        const catToDeleteProductCount = getCategoryProductCount(categoryToDelete);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <BrandCard className="max-w-md w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  catToDeleteProductCount > 0 
                    ? 'bg-attention/20 text-attention' 
                    : 'bg-alert/20 text-alert'
                }`}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-deep">
                    {catToDeleteProductCount > 0 
                      ? 'Cannot Delete Category' 
                      : 'Delete Category'}
                  </h3>
                  <p className="text-xs text-slate mt-0.5">
                    Category: <span className="font-bold text-deep">{categoryToDelete.name}</span>
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-alert/10 border border-alert/20 rounded-xl text-alert text-xs font-medium">
                  {deleteError}
                </div>
              )}

              {catToDeleteProductCount > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate font-medium leading-relaxed">
                    This category currently contains <strong className="text-deep font-bold">{catToDeleteProductCount} product(s)</strong>. To protect catalog integrity, you must reassign or delete these products before this category can be removed.
                  </p>
                  <div className="flex justify-end pt-2">
                    <BrandButton
                      variant="primary"
                      onClick={() => setCategoryToDelete(null)}
                    >
                      Understood
                    </BrandButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-slate font-medium leading-relaxed">
                    Are you sure you want to delete this category? All category configurations and specifications will be permanently removed.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <BrandButton
                      variant="secondary"
                      onClick={() => setCategoryToDelete(null)}
                      disabled={deletingCat}
                    >
                      Cancel
                    </BrandButton>
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
                      className="flex items-center gap-2 px-5 py-2.5 bg-alert text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {deletingCat ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      Delete Category
                    </button>
                  </div>
                </div>
              )}
            </BrandCard>
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
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-dark-accent border-t-transparent"></div>
        <span className="font-semibold text-slate text-sm">Loading catalog...</span>
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
