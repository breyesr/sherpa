'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle, CheckCircle, Store, ClipboardList, ShoppingCart, ChevronRight, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import SafeDate from './SafeDate';
import { ClientResponse, BusinessProfileResponse } from '@/types/api';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  client?: ClientResponse | null; // If provided, we are in edit mode
  business: BusinessProfileResponse;
}

export default function ClientModal({ isOpen, onClose, onSuccess, token, client, business }: ClientModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'trade'

  // AI Report States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const isTrade = business?.vertical_type === 'TRADE';

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setCustomFields((client.custom_fields as Record<string, any>) || {});
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setCustomFields({});
    }
    setActiveTab('info');
    setAiReport(null);
  }, [client, isOpen]);

  // Fetch Trade Context
  const { data: tradeContext, isLoading: loadingTrade } = useQuery({
    queryKey: ['client-trade-detail', client?.id],
    queryFn: async () => {
      if (!client) return null;
      const res = await fetch(`${API_BASE_URL}/crm/clients/${client.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch client trade context');
      return res.json();
    },
    enabled: !!client?.id && !!token && activeTab === 'trade' && isTrade,
  });

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateReport = async (role: 'briefer' | 'qualifier') => {
    if (!client) return;
    setGeneratingReport(true);
    setAiReport(null);
    try {
      const res = await fetch(`${API_BASE_URL}/trade/clients/${client.id}/${role}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate AI report');
      const data = await res.json();
      setAiReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = client 
        ? `${API_BASE_URL}/crm/clients/${client.id}`
        : `${API_BASE_URL}/crm/clients`;
      
      const method = client ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone, email, custom_fields: customFields })
      });

      if (!res.ok) throw new Error(`Failed to ${client ? 'update' : 'create'} client`);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async () => {
    if (!client) return;
    setResolving(true);
    setError('');

    try {
      const updatedFields = { ...client.custom_fields, needs_review: false };
      const res = await fetch(`${API_BASE_URL}/crm/clients/${client.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ custom_fields: updatedFields })
      });

      if (!res.ok) throw new Error('Failed to resolve alert');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  };

  const handleDelete = async () => {
    if (!client || !confirm(`Are you sure you want to delete ${client.name}?`)) return;
    
    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/crm/clients/${client.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to delete client');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 transition-all duration-300 ${activeTab === 'trade' ? 'w-full max-w-2xl' : 'w-full max-w-md'} max-h-[90vh]`}>
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client ? 'Client Profile' : 'Add New Client'}</h2>
            <div className="flex items-center gap-4 mt-2">
              <button 
                onClick={() => setActiveTab('info')}
                className={`text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'info' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >
                Information
              </button>
              {client && isTrade && (
                <button 
                  onClick={() => setActiveTab('trade')}
                  className={`text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'trade' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                  Trade Context
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'info' ? (
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              {client?.custom_fields?.needs_review && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800">Review Requested by AI</p>
                    <p className="text-xs text-red-600 mt-1">
                      Reason: {client.custom_fields.review_reason || 'Manual intervention needed'}
                    </p>
                    <button
                      type="button"
                      onClick={handleResolveAlert}
                      disabled={resolving}
                      className="mt-3 flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-all shadow-sm"
                    >
                      {resolving ? 'Resolving...' : (
                        <>
                          <CheckCircle size={14} />
                          Mark as Resolved
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name *</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number *</label>
                <input 
                  required
                  type="tel" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  placeholder="+1 234 567 890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Email (Optional)</label>
                <input 
                  type="email" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Dynamic Custom Fields */}
              {business?.crm_config?.length > 0 && (
                <div className="pt-4 space-y-6 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Additional Information</h3>
                  <div className="grid grid-cols-1 gap-6">
                    {business.crm_config.map((field: any) => (
                      <div key={field.key} className="space-y-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">{field.label}</label>
                        {field.type === 'boolean' ? (
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox"
                              checked={!!customFields[field.key]}
                              onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
                              className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                            />
                            <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Enabled</span>
                          </label>
                        ) : (
                          <input 
                            type={field.type === 'number' ? 'number' : 'text'} 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            value={customFields[field.key] || ''}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 flex flex-col gap-3">
                <button 
                  disabled={loading || deleting}
                  type="submit"
                  className="w-full bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
                </button>
                
                {client && (
                  <button 
                    type="button"
                    disabled={loading || deleting}
                    onClick={handleDelete}
                    className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 hover:bg-red-50 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                    {deleting ? 'Deleting...' : 'Delete Client'}
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2">
              {loadingTrade ? (
                <div className="py-20 text-center animate-pulse text-gray-400 font-bold">Loading trade context...</div>
              ) : (
                <>
                  {/* Stores */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Store size={14} className="text-blue-500" />
                      Linked Stores ({tradeContext?.stores?.length || 0})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tradeContext?.stores?.map((store: any) => (
                        <Link 
                          key={store.id} 
                          href={`/trade/stores/${store.id}`}
                          className="p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all group"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{store.name}</p>
                              <p className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{store.address}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500" />
                          </div>
                        </Link>
                      ))}
                      {(!tradeContext?.stores || tradeContext.stores.length === 0) && (
                        <p className="text-xs text-gray-400 italic">No stores linked to this client.</p>
                      )}
                    </div>
                  </div>

                  {/* Orders */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <ShoppingCart size={14} className="text-emerald-500" />
                      Recent Orders ({tradeContext?.orders?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {tradeContext?.orders?.map((order: any) => (
                        <div key={order.id} className="p-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                              <ShoppingCart size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">${order.total_amount.toFixed(2)}</p>
                              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                                <SafeDate date={order.created_at} />
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                            {order.status}
                          </span>
                        </div>
                      ))}
                      {(!tradeContext?.orders || tradeContext.orders.length === 0) && (
                        <p className="text-xs text-gray-400 italic">No orders found.</p>
                      )}
                    </div>
                  </div>

                  {/* Trade Notes */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <ClipboardList size={14} className="text-amber-500" />
                      Customer Context ({tradeContext?.trade_notes?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {tradeContext?.trade_notes?.map((note: any) => (
                        <div key={note.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-2">
                              {note.comm_style && <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-100 text-amber-700">{note.comm_style}</span>}
                              {note.visit_frequency && <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-100 text-amber-700">{note.visit_frequency}</span>}
                            </div>
                            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                              <SafeDate date={note.created_at} />
                            </span>
                          </div>
                          <p className="text-xs text-amber-900 leading-relaxed">{note.general_notes}</p>
                        </div>
                      ))}
                      {(!tradeContext?.trade_notes || tradeContext.trade_notes.length === 0) && (
                        <p className="text-xs text-gray-400 italic">No specialized trade notes found.</p>
                      )}
                    </div>
                  </div>

                  {/* AI STRATEGIC INSIGHTS */}
                  <div className="pt-6 border-t border-gray-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={14} />
                        AI Strategic Insights
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleGenerateReport('briefer')}
                        disabled={generatingReport}
                        className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold text-sm hover:bg-blue-100 transition-all border border-blue-100 disabled:opacity-50"
                      >
                        <BrainCircuit size={18} />
                        Visit Brief
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateReport('qualifier')}
                        disabled={generatingReport}
                        className="flex items-center justify-center gap-2 p-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100 disabled:opacity-50"
                      >
                        <Sparkles size={18} />
                        Qualify Lead
                      </button>
                    </div>

                    {generatingReport && (
                      <div className="p-8 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200 animate-pulse">
                        <Loader2 className="animate-spin mx-auto mb-2 text-blue-500" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Analyzing retailer data...</p>
                      </div>
                    )}

                    {aiReport && !generatingReport && (
                      <div className="bg-gray-900 text-gray-100 p-6 rounded-[2rem] text-sm leading-relaxed relative overflow-hidden animate-in fade-in slide-in-from-top-4">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Sparkles size={80} />
                        </div>
                        <div className="relative z-10 whitespace-pre-wrap font-medium">
                          {aiReport}
                        </div>
                        <button 
                          type="button"
                          onClick={() => setAiReport(null)}
                          className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                        >
                          Clear Analysis
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
