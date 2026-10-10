'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar,
  Store,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Mic,
  User,
  ExternalLink
} from 'lucide-react';
import SafeDate from '@/components/SafeDate';
import { Store as StoreModel } from '@/types/models';

interface FlattenedNote {
  id?: string;
  note?: string | null;
  note_type?: string | null;
  created_at?: string | null;
  is_actionable?: boolean | null;
  risks?: string | null;
  opportunities?: string | null;
  store_name: string;
  store_id: string;
  region?: string | null;
}

export default function NotesPulsePage() {
  const token = useAuthStore((state) => state.token);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'commercial' | 'marketing' | 'threat'>('all');

  // Fetch all notes from all stores
  // Note: Using the trade/stores endpoint and flattening for now, 
  // but a dedicated /trade/notes endpoint is recommended for the future.
  const { data: stores = [], isLoading } = useQuery<StoreModel[]>({
    queryKey: ['stores-with-notes'],
    queryFn: async () => {
      return await apiClient.get<StoreModel[]>('/trade/stores');
    },
    enabled: !!token,
  });

  // Flatten and sort notes
  const allNotes = stores.flatMap((store: StoreModel) => 
    (store.notes || []).map((note) => ({
      ...note,
      store_name: store.name,
      store_id: store.id,
      region: store.region
    }))
  ).sort((a: FlattenedNote, b: FlattenedNote) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const filteredNotes = allNotes.filter((note: FlattenedNote) => {
    const matchesSearch = 
      (note.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.store_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || note.note_type === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              Intelligence Hub
            </span>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            The Pulse
          </h1>
          <p className="text-gray-500 mt-2 font-medium text-lg max-w-2xl">
            A chronological ledger of every field observation, threat, and opportunity across your territory.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search notes, stores, or insights..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
          {(['all', 'commercial', 'marketing', 'threat'] as const).map((filter) => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === filter 
                  ? 'bg-white shadow-sm text-indigo-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {filter}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button className="flex items-center gap-2 px-3 py-2 text-gray-500 font-bold text-xs uppercase tracking-wider hover:text-gray-900 transition-all">
            <Filter size={16} />
            Advanced
          </button>
        </div>
      </div>

      {/* Intelligence Feed */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-gray-50 animate-pulse rounded-[2.5rem]" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-24 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <MessageSquare className="text-gray-300" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">No intelligence found</h3>
          <p className="text-gray-500 mt-2">Intelligence recorded during visits will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredNotes.map((note: FlattenedNote) => (
            <div 
              key={note.id}
              className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                      note.note_type === 'threat' ? 'bg-red-50 text-red-600 border-red-100' :
                      note.note_type === 'opportunity' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {note.note_type}
                    </span>
                    <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                      <Calendar size={14} />
                      <SafeDate date={note.created_at || ''} />
                    </div>
                    {note.is_actionable && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg">
                        <AlertCircle size={12} />
                        Actionable
                      </span>
                    )}
                    {/* Future Provenance Indicator */}
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                      <Mic size={12} />
                      Audio Source
                    </div>
                  </div>

                  {/* Narrative Content */}
                  <div className="relative">
                    <p className="text-xl font-medium text-gray-900 leading-relaxed italic pr-12">
                      &quot;{note.note}&quot;
                    </p>
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all">
                        <ExternalLink size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Extract / Summary */}
                  {(note.risks || note.opportunities) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {note.risks && (
                        <div className="p-4 bg-red-50/30 rounded-2xl border border-red-50">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Risk Extract</p>
                          <p className="text-sm font-bold text-red-900">{note.risks}</p>
                        </div>
                      )}
                      {note.opportunities && (
                        <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-50">
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Opportunity Extract</p>
                          <p className="text-sm font-bold text-emerald-900">{note.opportunities}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Account Sidebar */}
                <div className="md:w-64 shrink-0 flex flex-col justify-between p-6 bg-gray-50 rounded-[2rem] border border-gray-100/50 group-hover:bg-white transition-colors">
                  <div className="space-y-4">
                    <Link 
                      href={`/trade/stores/${note.store_id}`}
                      className="group/link block space-y-1"
                    >
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account</span>
                      <div className="flex items-center gap-2 text-gray-900 group-hover/link:text-indigo-600 transition-colors">
                        <Store size={16} />
                        <span className="font-bold text-sm truncate">{note.store_name}</span>
                      </div>
                    </Link>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Region</span>
                      <div className="flex items-center gap-2 text-gray-600">
                        <TrendingUp size={16} className="text-indigo-400" />
                        <span className="font-bold text-sm">{note.region || 'National'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                        <User size={14} />
                      </div>
                      <span className="text-xs font-bold text-gray-500">Rep ID: 04</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
