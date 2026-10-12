'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { 
  Users as UserIcon, 
  Mail, 
  Phone,
  Plus,
  ChevronRight,
  Search,
  LayoutGrid,
  List as ListIcon,
  Filter,
  MessageSquare,
  Edit2,
  Trash2
} from 'lucide-react';
import { Client } from '@/types/models';
import { useDrawerStore } from '@/lib/store/DrawerManager';
import { BrandCard, BrandButton, BrandBadge } from '@/components/ui/brand';

function ProspectContactsContent() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const segment = searchParams.get('segment') || 'wholesale';
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // Fetch Prospect Contacts (Clients with is_prospect=true)
  const { data: prospects = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', { is_prospect: true, segment }],
    queryFn: async () => {
      return await apiClient.get<Client[]>(`/crm/clients?is_prospect=true&prospect_segment=${segment}`);
    },
    enabled: !!token,
  });

  const filteredProspects = prospects.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.phone && p.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div id="v2-prospect-contacts-container" className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BrandBadge variant="accent">
              Inbound Pipeline
            </BrandBadge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-deep tracking-tight">
            Contacts
          </h1>
          <p className="text-slate mt-2 font-medium text-base max-w-2xl">
            Inbound qualified prospective leads from campaigns and conversational funnels.
          </p>
        </div>
        <BrandButton 
          onClick={() => openDrawer('contact', { clientId: null, isProspect: true })}
          className="shadow-sm"
        >
          <Plus size={16} className="mr-2" />
          Add Contact
        </BrandButton>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-surface p-4 rounded-2xl border border-utility shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" size={16} />
          <input 
            type="text"
            placeholder="Search contacts by name, email, or phone..."
            className="w-full pl-11 pr-4 py-2.5 bg-canvas border border-utility rounded-xl focus:border-deep outline-none transition-all font-medium text-deep placeholder:text-slate text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-canvas p-1 rounded-xl border border-utility">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-surface shadow-sm text-deep border border-utility' : 'text-slate hover:text-deep'}`}
          >
            <ListIcon size={18} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-surface shadow-sm text-deep border border-utility' : 'text-slate hover:text-deep'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <div className="w-px h-5 bg-utility mx-1" />
          <button className="flex items-center gap-2 px-3 py-1.5 text-slate font-semibold text-xs uppercase tracking-wider hover:text-deep transition-all">
            <Filter size={14} />
            Filter
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading || !token ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-surface animate-pulse rounded-2xl border border-utility" />
          ))}
        </div>
      ) : filteredProspects.length === 0 ? (
        <div className="py-16 text-center bg-surface rounded-2xl border-2 border-dashed border-utility">
          <div className="w-16 h-16 bg-canvas rounded-2xl border border-utility flex items-center justify-center mx-auto mb-4 shadow-sm text-slate">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-bold text-deep">No contacts found</h3>
          <p className="text-slate text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === 'list' ? (
        <BrandCard className="p-0 overflow-hidden">
          <div className="divide-y divide-utility">
            {filteredProspects.map((retailer) => (
              <div key={retailer.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-surface/50 transition-all cursor-pointer">
                <Link 
                  href={`/trade/entities/retailers/${retailer.id}`}
                  className="absolute inset-0 z-0"
                />
                <div className="relative z-10 flex items-center gap-5 pointer-events-none flex-1">
                  <div className="w-12 h-12 bg-ear/20 text-deep rounded-xl flex items-center justify-center border border-utility shadow-sm group-hover:bg-ear/40 transition-all">
                    <UserIcon size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-deep group-hover:text-dark-accent transition-colors">
                      {retailer.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-slate text-xs font-medium">
                      {retailer.role && (
                        <BrandBadge variant="neutral">
                          {retailer.role}
                        </BrandBadge>
                      )}
                      {retailer.phone && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone size={13} className="text-slate" />
                          <span>{retailer.phone}</span>
                        </div>
                      )}
                      {retailer.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate" />
                          <span>{retailer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 flex items-center gap-8 mt-4 md:mt-0">
                  <div className="hidden lg:flex flex-col items-end pointer-events-none">
                    <span className="text-[10px] font-bold text-slate uppercase tracking-wider mb-0.5">Lead Source</span>
                    <span className="font-semibold text-deep text-xs">
                      {typeof retailer.custom_fields === 'object' && retailer.custom_fields !== null 
                        ? (retailer.custom_fields as Record<string, unknown>).lead_source as string || 'WhatsApp Inbound' 
                        : 'WhatsApp Inbound'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end pointer-events-none">
                    <span className="text-[10px] font-bold text-slate uppercase tracking-wider mb-0.5">Status</span>
                    <BrandBadge variant={
                      typeof retailer.custom_fields === 'object' && retailer.custom_fields !== null && (retailer.custom_fields as Record<string, unknown>).status === 'waitlist'
                        ? 'pending'
                        : 'confirmed'
                    }>
                      {typeof retailer.custom_fields === 'object' && retailer.custom_fields !== null && (retailer.custom_fields as Record<string, unknown>).status === 'waitlist'
                        ? 'Waitlist'
                        : 'Qualified'}
                    </BrandBadge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDrawer('contact', { clientId: retailer.id, initialData: retailer, isProspect: true });
                      }}
                      className="p-2 text-slate hover:text-deep hover:bg-canvas rounded-lg transition-all relative z-20"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete prospect contact ${retailer.name}?`)) {
                          try {
                            await apiClient.delete<void>(`/crm/clients/${retailer.id}`);
                            queryClient.invalidateQueries({ queryKey: ['clients'] });
                          } catch {
                            alert('Failed to delete prospect contact');
                          }
                        }
                      }}
                      className="p-2 text-slate hover:text-alert hover:bg-alert/10 rounded-lg transition-all relative z-20"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className="text-slate group-hover:text-deep group-hover:translate-x-0.5 transition-all pointer-events-none ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BrandCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProspects.map((retailer) => (
            <BrandCard 
              key={retailer.id} 
              className="group relative p-6 flex flex-col justify-between hover:border-utility/80 transition-all cursor-pointer"
            >
              <Link 
                href={`/trade/entities/retailers/${retailer.id}`}
                className="absolute inset-0 z-0"
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 bg-ear/20 text-deep rounded-xl flex items-center justify-center border border-utility shadow-sm group-hover:bg-ear/40 transition-all">
                    <UserIcon size={22} />
                  </div>
                  <div className="flex gap-1 relative z-20">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDrawer('contact', { clientId: retailer.id, initialData: retailer, isProspect: true });
                      }}
                      className="p-1.5 text-slate hover:text-deep hover:bg-canvas rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete prospect ${retailer.name}?`)) {
                          try {
                            await apiClient.delete<void>(`/crm/clients/${retailer.id}`);
                            queryClient.invalidateQueries({ queryKey: ['clients'] });
                          } catch {
                            alert('Failed to delete prospect');
                          }
                        }
                      }}
                      className="p-1.5 text-slate hover:text-alert hover:bg-alert/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-deep mb-1 group-hover:text-dark-accent transition-colors">
                  {retailer.name}
                </h3>
                <p className="text-slate font-medium text-xs line-clamp-2 mb-4">
                  {retailer.role || 'Qualified Campaign Lead'}
                </p>
                <div className="flex flex-col gap-2">
                  {retailer.phone && (
                    <div className="flex items-center gap-2 text-xs font-mono text-slate">
                      <Phone size={13} className="text-slate" />
                      {retailer.phone}
                    </div>
                  )}
                  {retailer.email && (
                    <div className="flex items-center gap-2 text-xs text-slate">
                      <Mail size={13} className="text-slate" />
                      {retailer.email}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-5 border-t border-utility flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate uppercase tracking-wider">Status</span>
                  <BrandBadge variant="confirmed" className="mt-0.5">
                    Qualified Lead
                  </BrandBadge>
                </div>
                <ChevronRight size={16} className="text-slate group-hover:text-deep transition-all" />
              </div>
            </BrandCard>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProspectContactsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold text-gray-400">Loading contacts...</div>}>
      <ProspectContactsContent />
    </Suspense>
  );
}
