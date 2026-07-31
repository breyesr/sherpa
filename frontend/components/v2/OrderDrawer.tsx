'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import Drawer from './Drawer';
import { 
  ShoppingBag, 
  Store, 
  User, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Package,
  ArrowRight
} from 'lucide-react';

interface OrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  preselectedStoreId?: string;
}

export default function OrderDrawer({ isOpen, onClose, token, preselectedStoreId }: OrderDrawerProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [headerData, setHeaderData] = useState({
    store_id: preselectedStoreId || '',
    client_id: '',
    notes: '',
    payment_method: 'Cash'
  });

  const [lineItems, setLineItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Data Fetching
  const { data: stores = [] } = useQuery({
    queryKey: ['stores-minimal'],
    queryFn: () => apiClient.get<any[]>('/trade/stores'),
    enabled: isOpen,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products-catalog'],
    queryFn: () => apiClient.get<any[]>('/trade/products'),
    enabled: isOpen && step === 2,
  });

  useEffect(() => {
    if (preselectedStoreId) setHeaderData(prev => ({ ...prev, store_id: preselectedStoreId }));
  }, [preselectedStoreId]);

  const selectedStore = useMemo(() => stores.find((s: any) => s.id === headerData.store_id), [stores, headerData.store_id]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts.slice(0, 5);
    return allProducts.filter((p: any) => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [allProducts, productSearch]);

  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [lineItems]);

  const addToOrder = (product: any) => {
    const existing = lineItems.find(item => item.id === product.id);
    if (existing) {
      setLineItems(lineItems.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setLineItems([...lineItems, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      await apiClient.post<any>('/trade/orders', {
        ...headerData,
        items: lineItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        }))
      });

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (headerData.store_id) queryClient.invalidateQueries({ queryKey: ['store', headerData.store_id] });
      
      onClose();
      resetDrawer();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetDrawer = () => {
    setStep(1);
    setHeaderData({ store_id: preselectedStoreId || '', client_id: '', notes: '', payment_method: 'Cash' });
    setLineItems([]);
    setProductSearch('');
  };

  const footer = (
    <div className="flex gap-4">
      {step > 1 && (
        <button 
          onClick={() => setStep(step - 1)}
          className="px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {step < 3 ? (
        <button 
          onClick={() => setStep(step + 1)}
          disabled={step === 1 && !headerData.store_id || step === 2 && lineItems.length === 0}
          className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Continue <ArrowRight size={20} />
        </button>
      ) : (
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Complete Order'}
        </button>
      )}
    </div>
  );

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Surgical Order" 
      subtitle={step === 1 ? "Step 1: Header Details" : step === 2 ? "Step 2: Line Items" : "Step 3: Final Review"}
      footer={footer}
      size="wide"
    >
      <div className="space-y-8">
        {/* Progress Bar */}
        <div className="flex gap-2 h-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-blue-600' : 'bg-gray-100'}`} />
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Account</label>
              <div className="relative">
                <select 
                  className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                  value={headerData.store_id}
                  onChange={e => setHeaderData({...headerData, store_id: e.target.value})}
                  disabled={!!preselectedStoreId}
                >
                  <option value="">Select a store...</option>
                  {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Store size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact (Optional)</label>
              <div className="relative">
                <select 
                  className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                  value={headerData.client_id}
                  onChange={e => setHeaderData({...headerData, client_id: e.target.value})}
                >
                  <option value="">No specific contact</option>
                  {selectedStore?.clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {['Cash', 'Credit', 'Transfer', 'Consignment'].map(method => (
                  <button 
                    key={method}
                    onClick={() => setHeaderData({...headerData, payment_method: method})}
                    className={`p-3 rounded-xl text-xs font-bold transition-all border ${
                      headerData.payment_method === method 
                        ? 'bg-blue-50 border-blue-200 text-blue-600' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Order Notes</label>
              <textarea 
                rows={3}
                placeholder="Delivery instructions, special requests..."
                className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-900 resize-none"
                value={headerData.notes}
                onChange={e => setHeaderData({...headerData, notes: e.target.value})}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Product Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search catalog by name or SKU..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>

            {/* Quick Add Results */}
            <div className="grid grid-cols-1 gap-2">
              {filteredProducts.map((product: any) => (
                <button 
                  key={product.id}
                  onClick={() => addToOrder(product)}
                  className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{product.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{product.sku || 'No SKU'} • ${product.price}</p>
                    </div>
                  </div>
                  <Plus size={18} className="text-gray-300 group-hover:text-blue-600" />
                </button>
              ))}
            </div>

            {/* Line Items List */}
            <div className="pt-6 border-t border-gray-100">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Cart ({lineItems.length} items)</h4>
              <div className="space-y-3">
                {lineItems.length === 0 ? (
                  <div className="py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                    <ShoppingBag className="mx-auto text-gray-200 mb-2" size={32} />
                    <p className="text-xs font-bold text-gray-400 uppercase">Cart is empty</p>
                  </div>
                ) : (
                  lineItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
                            <Minus size={14} className="text-gray-400" />
                          </button>
                          <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
                            <Plus size={14} className="text-gray-400" />
                          </button>
                        </div>
                        <button onClick={() => updateQuantity(item.id, -item.quantity)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 text-blue-100">Total Value</p>
                  <h3 className="text-5xl font-black tracking-tight">${totalAmount.toLocaleString()}</h3>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <CheckCircle size={24} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 text-blue-100">Account</p>
                  <p className="font-bold text-sm truncate">{selectedStore?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 text-blue-100">Payment</p>
                  <p className="font-bold text-sm">{headerData.payment_method}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Line Item Summary</h4>
              <div className="space-y-2">
                {lineItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-50 px-1">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center text-[10px] font-black text-gray-500">{item.quantity}x</span>
                      <span className="text-sm font-bold text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-gray-900">${(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {headerData.notes && (
              <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Instructions</p>
                <p className="text-sm font-medium text-gray-600 italic">"{headerData.notes}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
