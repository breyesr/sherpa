'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  MessageSquare,
  Edit2,
  Trash2
} from 'lucide-react';
import { Client } from '@/types/models';
import { useDrawerStore } from '@/lib/store/DrawerManager';
import { BrandCard, BrandButton, BrandBadge } from '@/components/ui/brand';

export default function RetailersPageV2() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // Fetch Retailers (Clients)
  const { data: retailers = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      return await apiClient.get<Client[]>('/crm/clients');
    },
    enabled: !!token,
  });

  const filteredRetailers = retailers.filter((r) => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.email && r.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.phone && r.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-deep tracking-tight">
              Trade Clients & Contacts
            </h1>
            <BrandBadge variant="neutral">
              <span className="font-mono">{retailers.length}</span> CLIENTS
            </BrandBadge>
          </div>
          <p className="text-slate mt-1.5 font-medium text-base max-w-2xl">
            Centralized client intelligence for your retail partners and commercial decision makers.
          </p>
        </div>
        <BrandButton 
          variant="primary"
          onClick={() => openDrawer('contact', { clientId: null, isProspect: false })}
        >
          <Plus size={16} />
          Add Client
        </BrandButton>
      </div>

      {/* Control Bar */}
      <BrandCard className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate" size={16} />
          <input 
            type="text"
            placeholder="Search clients by name, email, or phone..."
            className="w-full pl-11 pr-4 py-2.5 bg-surface border border-utility rounded-xl focus:outline-none focus:ring-2 focus:ring-dark-accent text-sm font-medium text-deep"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-utility">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-canvas shadow-sm text-deep' : 'text-slate hover:text-deep'}`}
            title="List View"
          >
            <ListIcon size={18} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-canvas shadow-sm text-deep' : 'text-slate hover:text-deep'}`}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </BrandCard>

      {/* Content Area */}
      {isLoading || !token ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-surface animate-pulse rounded-2xl border border-utility" />
          ))}
        </div>
      ) : filteredRetailers.length === 0 ? (
        <BrandCard className="p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-surface text-slate rounded-2xl flex items-center justify-center mb-4 border border-utility">
            <UserIcon size={32} />
          </div>
          <h3 className="text-lg font-bold text-deep">No clients found</h3>
          <p className="text-slate text-sm mt-1">Try adjusting your search criteria or register a new client contact.</p>
        </BrandCard>
      ) : viewMode === 'list' ? (
        <BrandCard className="overflow-hidden">
          <div className="divide-y divide-utility">
            {filteredRetailers.map((retailer) => (
              <div key={retailer.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-surface/50 transition-colors cursor-pointer">
                <Link 
                  href={`/trade/entities/retailers/${retailer.id}`}
                  className="absolute inset-0 z-0"
                />
                <div className="relative z-10 flex items-center gap-5 pointer-events-none flex-1">
                  <div className="w-12 h-12 bg-ear/20 text-deep rounded-xl flex items-center justify-center group-hover:bg-ear/40 transition-colors shadow-sm">
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
                        <div className="flex items-center gap-1 font-mono">
                          <Phone size={12} className="text-slate" />
                          <span>{retailer.phone}</span>
                        </div>
                      )}
                      {retailer.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={12} className="text-slate" />
                          <span>{retailer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 flex items-center gap-8 mt-4 md:mt-0">
                  <div className="flex items-center gap-1.5 bg-surface border border-utility px-2.5 py-1 rounded-lg text-xs font-semibold text-deep pointer-events-none">
                    <MessageSquare size={13} className="text-dark-accent" />
                    <span>WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDrawer('contact', { clientId: retailer.id, initialData: retailer, isProspect: false });
                      }}
                      className="p-2 text-slate hover:text-deep hover:bg-surface rounded-lg transition-colors relative z-20"
                      title="Edit Client"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete client ${retailer.name}?`)) {
                          try {
                            await apiClient.delete<void>(`/crm/clients/${retailer.id}`);
                            queryClient.invalidateQueries({ queryKey: ['clients'] });
                          } catch (err) {
                            alert('Failed to delete client');
                          }
                        }
                      }}
                      className="p-2 text-slate hover:text-alert hover:bg-alert/10 rounded-lg transition-colors relative z-20"
                      title="Delete Client"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className="text-slate group-hover:text-deep group-hover:translate-x-0.5 transition-all pointer-events-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BrandCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRetailers.map((retailer) => (
            <BrandCard 
              key={retailer.id} 
              hoverable
              className="p-6 flex flex-col justify-between cursor-pointer relative group"
            >
              <Link 
                href={`/trade/entities/retailers/${retailer.id}`}
                className="absolute inset-0 z-0"
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-ear/20 text-deep rounded-xl flex items-center justify-center group-hover:bg-ear/40 transition-colors shadow-sm">
                    <UserIcon size={22} />
                  </div>
                  <div className="flex gap-1 relative z-20">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDrawer('contact', { clientId: retailer.id, initialData: retailer, isProspect: false });
                      }}
                      className="p-1.5 text-slate hover:text-deep transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete client ${retailer.name}?`)) {
                          try {
                            await apiClient.delete<void>(`/crm/clients/${retailer.id}`);
                            queryClient.invalidateQueries({ queryKey: ['clients'] });
                          } catch (err) {
                            alert('Failed to delete client');
                          }
                        }
                      }}
                      className="p-1.5 text-slate hover:text-alert transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-deep mb-1 group-hover:text-dark-accent transition-colors truncate">
                  {retailer.name}
                </h3>
                
                <p className="text-slate font-medium text-xs mb-3">
                  {retailer.role || 'Partner Retailer'}
                </p>
                <div className="flex flex-col gap-1.5">
                  {retailer.phone && (
                    <div className="flex items-center gap-2 text-xs font-mono text-slate">
                      <Phone size={13} className="text-slate" />
                      {retailer.phone}
                    </div>
                  )}
                  {retailer.email && (
                    <div className="flex items-center gap-2 text-xs text-slate truncate">
                      <Mail size={13} className="text-slate" />
                      {retailer.email}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-utility flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-dark-accent" />
                  <span className="text-slate font-semibold text-xs">Active Partner</span>
                </div>
                <ChevronRight size={16} className="text-slate group-hover:text-deep group-hover:translate-x-0.5 transition-all" />
              </div>
            </BrandCard>
          ))}
        </div>
      )}
    </div>
  );
}
