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
import { BrandCard, BrandBadge, BrandButton } from '@/components/ui/brand';

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
    <div id="v2-notes-pulse-container" className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BrandBadge variant="accent">
              Intelligence Hub
            </BrandBadge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-deep tracking-tight">
            The Pulse
          </h1>
          <p className="text-slate mt-2 font-medium text-base md:text-lg max-w-2xl">
            A chronological ledger of every field observation, threat, and opportunity across your territory.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-surface p-4 rounded-2xl border border-utility shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" size={16} />
          <input 
            type="text"
            placeholder="Search notes, stores, or insights..."
            className="w-full pl-11 pr-4 py-2.5 bg-canvas border border-utility rounded-xl focus:border-deep outline-none transition-all font-medium text-deep placeholder:text-slate text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-canvas p-1 rounded-xl border border-utility">
          {(['all', 'commercial', 'marketing', 'threat'] as const).map((filter) => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeFilter === filter 
                  ? 'bg-surface shadow-sm text-deep border border-utility' 
                  : 'text-slate hover:text-deep'
              }`}
            >
              {filter}
            </button>
          ))}
          <div className="w-px h-5 bg-utility mx-1" />
          <button className="flex items-center gap-2 px-3 py-1.5 text-slate font-semibold text-xs uppercase tracking-wider hover:text-deep transition-all">
            <Filter size={14} />
            Filter
          </button>
        </div>
      </div>

      {/* Intelligence Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-surface animate-pulse rounded-2xl border border-utility" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-20 text-center bg-surface rounded-2xl border-2 border-dashed border-utility">
          <div className="w-16 h-16 bg-canvas rounded-2xl border border-utility flex items-center justify-center mx-auto mb-4 shadow-sm text-slate">
            <MessageSquare size={28} />
          </div>
          <h3 className="text-lg font-bold text-deep">No intelligence found</h3>
          <p className="text-slate text-sm mt-1">Intelligence recorded during visits will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note: FlattenedNote) => (
            <BrandCard 
              key={note.id}
              className="p-6 md:p-7 hover:border-utility/80 transition-all"
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3.5">
                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <BrandBadge variant={
                      note.note_type === 'threat' ? 'alert' :
                      note.note_type === 'opportunity' ? 'confirmed' :
                      'neutral'
                    }>
                      {note.note_type}
                    </BrandBadge>
                    <div className="flex items-center gap-1.5 text-slate font-mono text-xs">
                      <Calendar size={13} />
                      <SafeDate date={note.created_at || ''} />
                    </div>
                    {note.is_actionable && (
                      <BrandBadge variant="pending">
                        <AlertCircle size={11} className="mr-1 inline" />
                        Actionable
                      </BrandBadge>
                    )}
                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate bg-surface px-2 py-0.5 rounded-md border border-utility">
                      <Mic size={11} />
                      Audio Source
                    </div>
                  </div>

                  {/* Narrative Content */}
                  <div className="relative">
                    <p className="text-lg font-medium text-deep leading-relaxed italic pr-10">
                      &quot;{note.note}&quot;
                    </p>
                  </div>

                  {/* Extract / Summary */}
                  {(note.risks || note.opportunities) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {note.risks && (
                        <div className="p-3.5 bg-alert/5 rounded-xl border border-alert/20">
                          <p className="text-[10px] font-bold text-alert uppercase tracking-wider mb-1">Risk Extract</p>
                          <p className="text-xs font-semibold text-deep">{note.risks}</p>
                        </div>
                      )}
                      {note.opportunities && (
                        <div className="p-3.5 bg-confirmed/5 rounded-xl border border-confirmed/20">
                          <p className="text-[10px] font-bold text-confirmed uppercase tracking-wider mb-1">Opportunity Extract</p>
                          <p className="text-xs font-semibold text-deep">{note.opportunities}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Account Sidebar */}
                <div className="md:w-60 shrink-0 flex flex-col justify-between p-4 bg-surface rounded-xl border border-utility group-hover:bg-canvas transition-colors">
                  <div className="space-y-3">
                    <Link 
                      href={`/trade/entities/stores/${note.store_id}`}
                      className="group/link block space-y-0.5"
                    >
                      <span className="text-[10px] font-bold text-slate uppercase tracking-wider">Account</span>
                      <div className="flex items-center gap-1.5 text-deep group-hover/link:text-dark-accent transition-colors">
                        <Store size={15} />
                        <span className="font-bold text-sm truncate">{note.store_name}</span>
                      </div>
                    </Link>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate uppercase tracking-wider">Region</span>
                      <div className="flex items-center gap-1.5 text-slate font-mono text-xs">
                        <TrendingUp size={14} className="text-dark-accent" />
                        <span>{note.region || 'National'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-3.5 mt-3.5 border-t border-utility flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-ear/20 rounded-md flex items-center justify-center text-deep border border-utility">
                        <User size={12} />
                      </div>
                      <span className="text-xs font-mono text-slate">Rep ID: 04</span>
                    </div>
                    <ChevronRight size={15} className="text-slate group-hover:text-deep group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </BrandCard>
          ))}
        </div>
      )}
    </div>
  );
}
