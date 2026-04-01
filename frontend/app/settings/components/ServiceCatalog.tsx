'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Loader2, Scissors, Clock, DollarSign } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ServiceCatalogProps {
  token: string | null;
  onMessage: (message: { type: string, text: string }) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function ServiceCatalog({ token, onMessage, onDirtyChange }: ServiceCatalogProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialForm = {
    name: '',
    description: '',
    duration_minutes: 60,
    price: '',
    attributes: {}
  };

  const [form, setForm] = useState(initialForm);

  // Dirty checking for the form
  useEffect(() => {
    if (!isAdding && !editingId) {
      onDirtyChange?.(false);
      return;
    }

    // If we are editing, we need to find the original service to compare
    // For simplicity, if isAdding is true, we consider it dirty if form is not empty
    const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
    onDirtyChange?.(isDirty);
  }, [form, isAdding, editingId, onDirtyChange]);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/services/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    }
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/services/${editingId}` : `${API_BASE_URL}/services/`;
      const method = editingId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        onMessage({ type: 'success', text: `Service ${editingId ? 'updated' : 'created'} successfully!` });
        queryClient.invalidateQueries({ queryKey: ['services'] });
        setIsAdding(false);
        setEditingId(null);
        setForm({ name: '', description: '', duration_minutes: 60, price: '', attributes: {} });
      } else {
        throw new Error('Failed to save service');
      }
    } catch (err: any) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onMessage({ type: 'success', text: 'Service deleted successfully' });
        queryClient.invalidateQueries({ queryKey: ['services'] });
      }
    } catch (err: any) {
      onMessage({ type: 'error', text: err.message });
    }
  };

  const startEdit = (service: any) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price || '',
      attributes: service.attributes || {}
    });
    setIsAdding(true);
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-gray-400 font-medium">Loading catalog...</div>;

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
        <div className="flex items-center justify-between border-b border-gray-50 pb-6">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Scissors size={22} />
            </div>
            <h2>Service Catalog</h2>
          </div>
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 text-sm"
            >
              <Plus size={18} />
              Add Service
            </button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{editingId ? 'Edit Service' : 'New Service'}</h3>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service Name</label>
                <input 
                  required
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Premium Haircut"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration (Min)</label>
                  <input 
                    type="number"
                    value={form.duration_minutes}
                    onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value)})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</label>
                  <input 
                    type="text"
                    value={form.price}
                    onChange={e => setForm({...form, price: e.target.value})}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="25.00"
                  />
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                <textarea 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  placeholder="What is included in this service?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-6 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {editingId ? 'Update Service' : 'Create Service'}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4">
          {services.length === 0 && !isAdding && (
            <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-gray-400 font-medium">Your catalog is empty. Add your first service to start booking!</p>
            </div>
          )}
          {services.map((svc: any) => (
            <div key={svc.id} className="group flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-blue-500 shadow-sm">
                  <Scissors size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{svc.name}</h4>
                  <div className="flex gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                      <Clock size={12} /> {svc.duration_minutes} min
                    </span>
                    {svc.price && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                        <DollarSign size={12} /> {svc.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => startEdit(svc)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(svc.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
