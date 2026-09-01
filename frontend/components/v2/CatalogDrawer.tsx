'use client';

import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import Drawer from './Drawer';
import { 
  Package, 
  LayoutGrid, 
  Tag, 
  DollarSign, 
  Barcode, 
  Loader2, 
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Settings,
  CheckCircle,
  X
} from 'lucide-react';

import { Product, CatalogField } from '@/types/models';
import ManageCatalogAttributesDrawer from './ManageCatalogAttributesDrawer';

interface CatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  initialMode?: 'product' | 'category';
  productId?: string | null;
  initialData?: Partial<Product>;
}

export default function CatalogDrawer({ isOpen, onClose, token, initialMode = 'product', productId, initialData }: CatalogDrawerProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'product' | 'category'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manage attributes drawer state
  const [isManageAttributesOpen, setIsManageAttributesOpen] = useState(false);

  // Custom Attribute Creation States
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'boolean' | 'date' | 'dropdown' | 'textarea' | 'multiselect'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [isSavingNewField, setIsSavingNewField] = useState(false);
  const [newFieldErr, setNewFieldErr] = useState('');

  // Fetch Business Profile
  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      if (!token) return null;
      try {
        return await apiClient.get<any>('/business/me');
      } catch {
        // Silent fail
      }
      return null;
    },
    enabled: !!token,
  });

  const isB2C = business?.vertical_type === 'BASIC';
  
  const isEditing = !!productId;
  
  // Categories for product selection
  const [categories, setCategories] = useState<any[]>([]);
  const [fetchingCats, setFetchingCats] = useState(false);

  // Form States
  const [productData, setProductData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: 0,
    sku: '',
    brand: '',
    product_type: '',
    unit_of_measure: 'unit',
    wholesale_threshold: '' as string | number
  });

  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  const [categoryData, setCategoryData] = useState({
    name: '',
    description: '',
    category_type: ''
  });

  useEffect(() => {
    if (isOpen) {
      setMode(productId ? 'product' : initialMode);
      fetchCategories();
      
      if (productId) {
        if (initialData) {
          setProductData({
            name: initialData.name || '',
            category_id: initialData.category_id || '',
            description: initialData.description || '',
            price: initialData.price || 0,
            sku: initialData.sku || '',
            brand: initialData.brand || '',
            product_type: initialData.product_type || '',
            unit_of_measure: initialData.unit_of_measure || 'unit',
            wholesale_threshold: initialData.wholesale_threshold ?? ''
          });
          setCustomFields((initialData.custom_fields as Record<string, any>) || {});
        } else {
          // Fetch from API
          const fetchProduct = async () => {
            try {
              const data = await apiClient.get<any>(`/trade/products/${productId}`);
              setProductData({
                name: data.name || '',
                category_id: data.category_id || '',
                description: data.description || '',
                price: data.price || 0,
                sku: data.sku || '',
                brand: data.brand || '',
                product_type: data.product_type || '',
                unit_of_measure: data.unit_of_measure || 'unit',
                wholesale_threshold: data.wholesale_threshold ?? ''
              });
              setCustomFields((data.custom_fields as Record<string, any>) || {});
            } catch (err) {
              console.error(err);
            }
          };
          fetchProduct();
        }
      } else {
        resetForms();
      }
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
      setNewFieldErr('');
    }
  }, [isOpen, initialMode, productId, initialData]);

  async function fetchCategories() {
    setFetchingCats(true);
    try {
      const data = await apiClient.get<any[]>('/trade/categories');
      setCategories(data);
      if (data.length > 0 && !productData.category_id && !productId) {
        setProductData(prev => ({ ...prev, category_id: data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingCats(false);
    }
  }

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveNewField = async () => {
    if (!business) return;
    if (!newFieldName.trim()) {
      setNewFieldErr('Field name is required');
      return;
    }
    const cleanKey = newFieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_');
    if (!cleanKey || cleanKey === '_') {
      setNewFieldErr('Invalid field name');
      return;
    }

    const existingAttributes = (business.catalog_config as unknown as CatalogField[]) || [];
    const isDuplicate = existingAttributes.some((f: CatalogField) => f.key === cleanKey);
    if (isDuplicate) {
      setNewFieldErr(`An attribute with key "${cleanKey}" already exists`);
      return;
    }

    setIsSavingNewField(true);
    setNewFieldErr('');

    const newField: CatalogField = {
      key: cleanKey,
      label: newFieldName.trim(),
      type: newFieldType
    };

    if (newFieldType === 'dropdown' || newFieldType === 'multiselect') {
      const optionsArray = newFieldOptions.split(',').map(o => o.trim()).filter(Boolean);
      if (optionsArray.length === 0) {
        setNewFieldErr('Options are required for this field type');
        setIsSavingNewField(false);
        return;
      }
      newField.options = optionsArray;
    }

    const newAttributes = [...existingAttributes, newField];

    try {
      await apiClient.patch<any>('/business/me', { catalog_config: newAttributes });

      await queryClient.invalidateQueries({ queryKey: ['business'] });
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
    } catch (err: unknown) {
      setNewFieldErr(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSavingNewField(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const path = isEditing 
        ? `/trade/products/${productId}` 
        : `/trade/products`;

      const payload = {
        ...productData,
        wholesale_threshold: productData.wholesale_threshold !== '' && productData.wholesale_threshold !== null
          ? parseInt(productData.wholesale_threshold as any, 10)
          : null,
        custom_fields: customFields
      };

      if (isEditing) {
        await apiClient.patch<any>(path, payload);
      } else {
        await apiClient.post<any>(path, payload);
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ['product', productId] });
      }
      onClose();
      resetForms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiClient.post<any>('/trade/categories', categoryData);

      queryClient.invalidateQueries({ queryKey: ['categories'] });
      fetchCategories(); // Refresh local list
      setMode('product'); // Switch back to product mode to add items to new category
      setCategoryData({ name: '', description: '', category_type: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setProductData({
      name: '',
      category_id: '',
      description: '',
      price: 0,
      sku: '',
      brand: '',
      product_type: '',
      unit_of_measure: 'unit',
      wholesale_threshold: ''
    });
    setCustomFields({});
    setCategoryData({ name: '', description: '', category_type: '' });
  };

  const footer = (
    <div className="flex gap-4">
      <button 
        onClick={onClose}
        className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
      >
        Cancel
      </button>
      <button 
        onClick={mode === 'product' ? handleProductSubmit : handleCategorySubmit}
        disabled={loading || (mode === 'product' && (!productData.name || !productData.category_id)) || (mode === 'category' && !categoryData.name)}
        className={`flex-1 px-6 py-4 ${mode === 'product' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-emerald-600 shadow-emerald-500/20'} text-white rounded-2xl font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'Update Product' : (mode === 'product' ? 'Save Product' : 'Create Category'))}
      </button>
    </div>
  );

  return (
    <>
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? "Edit Product" : (mode === 'product' ? "Add Product" : "New Category")} 
      subtitle={isEditing ? "Update product specifications and pricing." : (mode === 'product' ? "Define SKU, pricing, and category." : "Group your inventory for better tracking.")}
      footer={footer}
      size="wide"
    >
      <div className="space-y-8">
        {/* Mode Selector */}
        {!isEditing && (
          <div className="flex p-1.5 bg-gray-50 rounded-2xl">
            <button 
              onClick={() => setMode('product')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                mode === 'product' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Package size={16} /> Product
            </button>
            <button 
              onClick={() => setMode('category')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                mode === 'category' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LayoutGrid size={16} /> Category
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {mode === 'product' ? (
          <div className="space-y-6">
            {/* Primary Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Identity</label>
                <div className="relative">
                  <input 
                    required
                    type="text"
                    placeholder="e.g. Premium Arabica 500g"
                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-900"
                    value={productData.name}
                    onChange={e => setProductData({...productData, name: e.target.value})}
                  />
                  <Package size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Assignment</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-indigo-500"
                    value={productData.category_id}
                    onChange={e => setProductData({...productData, category_id: e.target.value})}
                    disabled={fetchingCats}
                  >
                    {fetchingCats ? (
                      <option>Loading...</option>
                    ) : categories.length > 0 ? (
                      categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)
                    ) : (
                      <option value="">No categories found</option>
                    )}
                  </select>
                  <LayoutGrid size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                </div>
                {categories.length === 0 && !fetchingCats && (
                  <button 
                    onClick={() => setMode('category')}
                    className="text-[10px] text-emerald-600 font-bold ml-1 uppercase flex items-center gap-1 hover:underline"
                  >
                    <Plus size={10} /> Create a category first
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price Point ($)</label>
                <div className="relative">
                  <input 
                    required
                    type="number"
                    step="0.01"
                    className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={productData.price}
                    onChange={e => setProductData({...productData, price: parseFloat(e.target.value) || 0})}
                  />
                  <DollarSign size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                </div>
              </div>
            </div>

            {/* Catalog Metadata */}
            <div className="p-6 bg-gray-50 rounded-[2rem] space-y-6">
               <div className="flex items-center gap-2 mb-2">
                <Barcode size={16} className="text-indigo-500" />
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Inventory Metadata</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`space-y-2 ${isB2C ? 'col-span-2' : ''}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU / Code</label>
                  <input 
                    type="text"
                    placeholder="BEV-AR-500"
                    className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold font-mono"
                    value={productData.sku}
                    onChange={e => setProductData({...productData, sku: e.target.value})}
                  />
                </div>
                {!isB2C && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand</label>
                    <input 
                      type="text"
                      placeholder="e.g. Nespresso"
                      className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                      value={productData.brand}
                      onChange={e => setProductData({...productData, brand: e.target.value})}
                    />
                  </div>
                )}
              </div>

              {!isB2C && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Wholesale Threshold (Qty)</label>
                  <input 
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 50 (Leave empty for none)"
                    className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                    value={productData.wholesale_threshold}
                    onChange={e => setProductData({...productData, wholesale_threshold: e.target.value ? parseInt(e.target.value, 10) : ''})}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Description</label>
                <textarea 
                  rows={2}
                  placeholder="Highlights for the Field Rep..."
                  className="w-full p-4 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold resize-none"
                  value={productData.description}
                  onChange={e => setProductData({...productData, description: e.target.value})}
                />
              </div>
            </div>

            {/* Dynamic Custom Fields Section - Additional Information (B2C Service Pattern) */}
            <div className="p-6 bg-gray-50 rounded-[2rem] space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-500" />
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Additional Information</h4>
                </div>
                {!isAddingField && (
                  <button
                    type="button"
                    onClick={() => setIsAddingField(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-all px-3 py-1.5 rounded-xl hover:bg-indigo-50 border border-dashed border-indigo-200 hover:border-indigo-300"
                  >
                    <Plus size={14} />
                    Add Attribute
                  </button>
                )}
              </div>

              {/* Inline Form to add a new custom field */}
              {isAddingField && (
                <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-3 duration-200 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">New Custom Attribute</h5>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsAddingField(false);
                        setNewFieldName('');
                        setNewFieldType('text');
                        setNewFieldOptions('');
                        setNewFieldErr('');
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  {newFieldErr && (
                    <div className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{newFieldErr}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attribute Name</label>
                      <input 
                        type="text"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                        placeholder="e.g. Material or Certifications"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attribute Type</label>
                      <select 
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Checkbox</option>
                        <option value="date">Date</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="textarea">Text Area</option>
                        <option value="multiselect">Multi-select</option>
                      </select>
                    </div>
                  </div>

                  {(newFieldType === 'dropdown' || newFieldType === 'multiselect') && (
                    <div className="space-y-1 mt-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Options (comma-separated)</label>
                      <input 
                        type="text"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                        placeholder="e.g. Option 1, Option 2, Option 3"
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingField(false);
                        setNewFieldName('');
                        setNewFieldType('text');
                        setNewFieldOptions('');
                        setNewFieldErr('');
                      }}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingNewField}
                      onClick={handleSaveNewField}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingNewField ? (
                        <>
                          <Loader2 className="animate-spin" size={12} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={12} />
                          Save Attribute
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Attributes List */}
              {business?.catalog_config && (business.catalog_config as unknown as CatalogField[]).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(business.catalog_config as unknown as CatalogField[]).map((field) => (
                    <div key={field.key} className={`space-y-2 ${field.type === 'textarea' || field.type === 'multiselect' ? 'md:col-span-2' : ''}`}>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                      {field.type === 'boolean' ? (
                        <label className="flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-xl cursor-pointer group hover:border-indigo-200 transition-all">
                          <input 
                            type="checkbox"
                            checked={!!customFields[field.key]}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
                            className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                          />
                          <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Enabled</span>
                        </label>
                      ) : field.type === 'date' ? (
                        <input 
                          type="date"
                          className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                          value={(customFields[field.key] as string) || ''}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        />
                      ) : field.type === 'textarea' ? (
                        <textarea 
                          rows={2}
                          className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold resize-none"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          value={(customFields[field.key] as string) || ''}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        />
                      ) : field.type === 'dropdown' ? (
                        <select 
                          className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
                          value={(customFields[field.key] as string) || ''}
                          onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        >
                          <option value="">Select {field.label}...</option>
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'multiselect' ? (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {field.options?.map((opt: string) => {
                            const currentSelection = Array.isArray(customFields[field.key]) ? customFields[field.key] : [];
                            const isChecked = currentSelection.includes(opt);
                            return (
                              <label key={opt} className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-all">
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    let newArr = [...currentSelection];
                                    if (checked) {
                                      newArr.push(opt);
                                    } else {
                                      newArr = newArr.filter((val: string) => val !== opt);
                                    }
                                    handleCustomFieldChange(field.key, newArr);
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                                />
                                <span className="text-xs font-bold text-gray-700">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <input 
                          type={field.type === 'number' ? 'number' : 'text'}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="w-full p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                          value={(customFields[field.key] !== undefined && customFields[field.key] !== null) ? customFields[field.key] : ''}
                          onChange={(e) => handleCustomFieldChange(field.key, field.type === 'number' ? (e.target.value ? parseFloat(e.target.value) : '') : e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No custom attributes defined yet. Click &quot;+ Add Attribute&quot; to add specifications.</p>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageAttributesOpen(true)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <Settings size={14} />
                  Manage Attributes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Label</label>
              <input 
                required
                type="text"
                placeholder="e.g. Beverages, Perishables"
                className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-gray-900"
                value={categoryData.name}
                onChange={e => setCategoryData({...categoryData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Type / Vertical</label>
              <input 
                type="text"
                placeholder="e.g. FMCG, Pharma"
                className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-gray-900"
                value={categoryData.category_type}
                onChange={e => setCategoryData({...categoryData, category_type: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
              <textarea 
                rows={4}
                placeholder="How should products be grouped here?"
                className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-gray-900 resize-none"
                value={categoryData.description}
                onChange={e => setCategoryData({...categoryData, description: e.target.value})}
              />
            </div>

            <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <Plus size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-900">Successive Flow</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Saving a category will return you to product entry.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>

    <ManageCatalogAttributesDrawer
      isOpen={isManageAttributesOpen}
      onClose={() => setIsManageAttributesOpen(false)}
      business={business}
      token={token}
    />
    </>
  );
}
