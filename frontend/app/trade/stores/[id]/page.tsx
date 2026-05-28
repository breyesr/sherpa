'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import SafeDate from '@/components/SafeDate';
import { useAuthStore } from '@/store/authStore';
import { 
  Store as StoreIcon, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  ArrowLeft,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  MessageSquare,
  Plus,
  Loader2,
  Clock,
  ClipboardList,
  ChevronRight,
  Zap,
  Sparkles
} from 'lucide-react';
import StoreModal from '@/components/StoreModal';

export default function StoreDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Inline Editing States
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editExternalId, setEditExternalId] = useState('');
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  const { data: store, isLoading, error } = useQuery<StoreResponse>({
    queryKey: ['store', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Store not found');
      const data = await res.json();
      // Initialize inline states
      setEditName(data.name);
      setEditAddress(data.address || '');
      setEditExternalId(data.external_id || '');
      return data;
    },
    enabled: !!token && !!id,
  });

  const { data: brief, refetch: refetchBrief, isFetching: isFetchingBrief } = useQuery<{ report: string }>({
    queryKey: ['store-brief', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores/${id}/brief`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Brief not available');
      return res.json();
    },
    enabled: !!token && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleUpdateStore = async (fields: any) => {
    setIsSavingInline(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trade/stores/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fields)
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['store', id] });
      }
    } catch (err) {
      console.error('Failed to update store:', err);
    } finally {
      setIsSavingInline(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trade/stores/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          note: newNote
        })
      });

      if (res.ok) {
        setNewNote('');
        queryClient.invalidateQueries({ queryKey: ['store', id] });
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (isLoading) return <div className="p-16 text-center animate-pulse text-gray-400 font-bold">Loading store details...</div>;
  if (error || !store) return (
    <div className="p-16 text-center">
      <h2 className="text-2xl font-bold text-gray-900">Store Not Found</h2>
      <button onClick={() => router.back()} className="mt-4 text-blue-600 font-bold hover:underline flex items-center justify-center gap-2 mx-auto">
        <ArrowLeft size={18} /> Go Back
      </button>
    </div>
  );

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'risk': return <AlertTriangle className="text-red-500" size={18} />;
      case 'opportunity': return <Lightbulb className="text-amber-500" size={18} />;
      case 'action': return <CheckCircle2 className="text-emerald-500" size={18} />;
      default: return <MessageSquare className="text-blue-500" size={18} />;
    }
  };

  const getNoteBg = (type: string) => {
    switch (type) {
      case 'risk': return 'bg-red-50 border-red-100';
      case 'opportunity': return 'bg-amber-50 border-amber-100';
      case 'action': return 'bg-emerald-50 border-emerald-100';
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 flex-1">
          <button 
            onClick={() => router.push('/trade/stores')}
            className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Stores
          </button>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-white border-2 border-gray-100 rounded-[2rem] flex items-center justify-center shadow-sm text-gray-400 shrink-0">
              <StoreIcon size={40} />
            </div>
            <div className="flex-1 space-y-1">
              <input 
                type="text"
                className="text-4xl font-black text-gray-900 tracking-tight bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 outline-none w-full transition-all px-0"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => editName !== store?.name && handleUpdateStore({ name: editName })}
              />
              <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-500 font-medium">
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <MapPin size={16} className="text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Physical address..."
                    className="text-sm bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 outline-none w-full transition-all px-0 py-0.5"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    onBlur={() => editAddress !== store?.address && handleUpdateStore({ address: editAddress })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">External ID:</span>
                  <input 
                    type="text"
                    placeholder="SKU/ID..."
                    className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black font-mono uppercase tracking-tighter border-none focus:ring-2 focus:ring-blue-500 outline-none w-32"
                    value={editExternalId}
                    onChange={e => setEditExternalId(e.target.value)}
                    onBlur={() => editExternalId !== store?.external_id && handleUpdateStore({ external_id: editExternalId })}
                  />
                </div>
                {isSavingInline && <Loader2 className="animate-spin text-blue-500" size={16} />}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
            Record Visit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Retailers & Health */}
        <div className="space-y-8">
          {/* AI Strategic Brief */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group min-h-[200px]">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Sparkles size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
                  <Zap size={20} className="text-yellow-400 fill-yellow-400" />
                  Strategic Brief
                </h3>
                <button 
                  onClick={() => refetchBrief()}
                  disabled={isFetchingBrief}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                  <Clock size={16} className={isFetchingBrief ? 'animate-spin' : ''} />
                </button>
              </div>
              
              {isFetchingBrief && !brief ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-3/4"></div>
                  <div className="h-4 bg-white/20 rounded w-full"></div>
                  <div className="h-4 bg-white/20 rounded w-5/6"></div>
                </div>
              ) : brief?.report ? (
                <div className="prose prose-invert prose-sm">
                  <p className="font-medium leading-relaxed opacity-90 italic">
                    "{brief.report}"
                  </p>
                </div>
              ) : (
                <p className="text-sm opacity-60">No intelligence gathered yet. Record a visit to generate insights.</p>
              )}
            </div>
          </div>

          {/* Retailers Card */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                <UserIcon size={20} className="text-blue-500" />
                Linked Retailers
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest"
              >
                Manage
              </button>
            </div>
            <div className="space-y-4">
              {store?.clients && store.clients.length > 0 ? (
                store.clients.map(client => (
                  <div key={client.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-100 hover:bg-white transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{client.name}</p>
                        <p className="text-xs text-blue-600 font-bold mt-1 flex items-center gap-1">
                          <Phone size={12} />
                          {client.phone || 'No phone'}
                        </p>
                      </div>
                      <Link 
                        href={`/trade/retailers?id=${client.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-gray-400 italic">No retailers linked. Click manage to add one.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl">
            <h3 className="font-bold text-lg opacity-60 uppercase tracking-widest">Store Health</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-3xl font-black">0</p>
                <p className="text-xs opacity-50 font-bold uppercase mt-1">Total Orders</p>
              </div>
              <div>
                <p className="text-3xl font-black">{store.notes?.length || 0}</p>
                <p className="text-xs opacity-50 font-bold uppercase mt-1">Dossier Entries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dossier System (Notes) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-2xl text-gray-900">Store Dossier</h3>
                <p className="text-sm text-gray-500 font-medium">Record observations, risks, and local opportunities.</p>
              </div>
            </div>

            {/* Note Input */}
            <div className="p-8 border-b border-gray-50">
              <form onSubmit={handleAddNote} className="relative">
                <textarea
                  placeholder="Write a field observation..."
                  className="w-full p-6 pb-16 border-2 rounded-3xl outline-none focus:ring-4 transition-all font-medium text-lg resize-none border-blue-100 focus:ring-blue-500/10 focus:border-blue-200"
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="absolute right-4 bottom-4">
                  <button 
                    disabled={isSubmittingNote || !newNote.trim()}
                    className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-black/10"
                  >
                    {isSubmittingNote ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    Add Entry
                  </button>
                </div>
              </form>
            </div>

            {/* Notes List */}
            <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[500px]">
              {store.notes && store.notes.length > 0 ? (
                [...store.notes].reverse().map((note: any) => (
                  <div key={note.id} className={`p-6 rounded-3xl border-2 transition-all hover:scale-[1.01] bg-gray-50 border-gray-100`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm">
                        <MessageSquare className="text-blue-500" size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">FIELD REPORT</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-widest">
                        <Clock size={14} />
                        <SafeDate date={note.created_at} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">{note.note}</p>
                      
                      {note.risks && (
                        <div className="flex items-start gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
                          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-0.5">Identified Risk</p>
                            <p className="text-sm font-medium text-red-900">{note.risks}</p>
                          </div>
                        </div>
                      )}
                      
                      {note.opportunities && (
                        <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                          <Lightbulb className="text-amber-500 shrink-0 mt-0.5" size={16} />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Opportunity</p>
                            <p className="text-sm font-medium text-amber-900">{note.opportunities}</p>
                          </div>
                        </div>
                      )}

                      {note.preferred_actions && (
                        <div className="flex items-start gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Suggested Action</p>
                            <p className="text-sm font-medium text-emerald-900">{note.preferred_actions}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto">
                    <ClipboardList size={32} />
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No observations recorded for this store.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <StoreModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['store', id] });
        }}
        token={token}
        store={store}
      />
    </div>
  );
}
