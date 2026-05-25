'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { 
  Store, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  MessageSquare,
  Plus,
  Loader2,
  Trash2,
  Clock
} from 'lucide-react';
import StoreModal from '@/components/StoreModal';

export default function StoreDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const { data: store, isLoading, error } = useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/trade/stores/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Store not found');
      return res.json();
    },
    enabled: !!token && !!id,
  });

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
          type: noteType,
          content: newNote
        })
      });

      if (res.ok) {
        setNewNote('');
        setNoteType('general');
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
        <div className="space-y-4">
          <button 
            onClick={() => router.push('/trade')}
            className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Trade Hub
          </button>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-white border-2 border-gray-100 rounded-[2rem] flex items-center justify-center shadow-sm text-gray-400">
              <Store size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">{store.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-500 font-medium">
                <span className="flex items-center gap-1.5"><MapPin size={16} className="text-gray-400" /> {store.address || 'No address provided'}</span>
                {store.external_id && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black font-mono uppercase tracking-tighter">ID: {store.external_id}</span>}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            Edit Store
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
            Record Visit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Stats */}
        <div className="space-y-8">
          {/* Contact Card */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
            <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <UserIcon size={20} className="text-blue-500" />
              Primary Contact
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</p>
                <p className="font-bold text-gray-900 text-lg">{store.contact_name || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                <p className="font-bold text-blue-600 text-lg flex items-center gap-2">
                  <Phone size={18} />
                  {store.contact_phone || 'None'}
                </p>
              </div>
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
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border shadow-sm">
                {['general', 'risk', 'opportunity', 'action'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setNoteType(type)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      noteType === type 
                        ? 'bg-gray-900 text-white shadow-md scale-105' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Note Input */}
            <div className="p-8 border-b border-gray-50">
              <form onSubmit={handleAddNote} className="relative">
                <textarea
                  placeholder={`Write a ${noteType} observation...`}
                  className={`w-full p-6 pb-16 border-2 rounded-3xl outline-none focus:ring-4 transition-all font-medium text-lg resize-none ${
                    noteType === 'risk' ? 'border-red-100 focus:ring-red-500/10 focus:border-red-200' :
                    noteType === 'opportunity' ? 'border-amber-100 focus:ring-amber-500/10 focus:border-amber-200' :
                    noteType === 'action' ? 'border-emerald-100 focus:ring-emerald-500/10 focus:border-emerald-200' :
                    'border-blue-100 focus:ring-blue-500/10 focus:border-blue-200'
                  }`}
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
                  <div key={note.id} className={`p-6 rounded-3xl border-2 transition-all hover:scale-[1.01] ${getNoteBg(note.type)}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm">
                        {getNoteIcon(note.type)}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">{note.type}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-widest">
                        <Clock size={14} />
                        {new Date(note.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>
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
