'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Tag, DollarSign, Barcode } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export default function AddProductModal({ isOpen, onClose, onSuccess, token }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: 0,
    sku: '',
    wholesale_threshold: '' as string | number
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCategories() {
      if (!isOpen) return;
      setFetchingCats(true);
      try {
        const data = await apiClient.get<any[]>('/trade/categories');
        setCategories(data);
        if (data.length > 0 && !formData.category_id) {
          setFormData(prev => ({ ...prev, category_id: data[0].id }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingCats(false);
      }
    }
    fetchCategories();
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        wholesale_threshold: formData.wholesale_threshold !== '' && formData.wholesale_threshold !== null
          ? parseInt(formData.wholesale_threshold as any, 10)
          : null
      };

      await apiClient.post('/trade/products', payload);

      onSuccess();
      onClose();
      setFormData({ name: '', category_id: '', description: '', price: 0, sku: '', wholesale_threshold: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">New Product</h2>
            <p className="text-sm text-gray-500 font-medium">Add an item to your trade catalog.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-all p-2 hover:bg-gray-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name *</label>
              <div className="relative">
                <input 
                  required
                  type="text"
                  placeholder="e.g. Coca Cola 500ml"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium pl-10"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Category *</label>
              <select 
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none"
                value={formData.category_id}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
                disabled={fetchingCats || categories.length === 0}
              >
                {fetchingCats ? (
                  <option>Loading...</option>
                ) : categories.length > 0 ? (
                  categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)
                ) : (
                  <option>No categories found</option>
                )}
              </select>
              {categories.length === 0 && !fetchingCats && (
                <p className="text-[10px] text-red-500 font-bold ml-1 uppercase tracking-tighter">Create a category first!</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Price ($) *</label>
              <div className="relative">
                <input 
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium pl-10"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                />
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">SKU / Internal Code</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="e.g. BEV-001"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm pl-10"
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                />
                <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Wholesale Threshold (Qty)</label>
              <div className="relative">
                <input 
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 50 (Leave empty for none)"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium pl-10"
                  value={formData.wholesale_threshold}
                  onChange={e => setFormData({...formData, wholesale_threshold: e.target.value ? parseInt(e.target.value, 10) : ''})}
                />
                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
              <textarea 
                rows={2}
                placeholder="Product highlights..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              disabled={loading || !formData.name || !formData.category_id || categories.length === 0}
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
