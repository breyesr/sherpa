'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Loader2, Scissors, Clock, DollarSign } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { components, BusinessProfileResponse } from '@/types/api';
import ServiceDrawer from '@/components/v2/ServiceDrawer';

type ServiceResponse = components['schemas']['ServiceResponse'];

interface ServiceCatalogProps {
  token: string | null;
  onMessage: (message: { type: string, text: string }) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function ServiceCatalog({ token, onMessage, onDirtyChange }: ServiceCatalogProps) {
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceResponse | null>(null);

  // We can just keep onDirtyChange as false since it's managed via drawer now
  useEffect(() => {
    onDirtyChange?.(false);
  }, [onDirtyChange]);

  const { data: business } = useQuery<BusinessProfileResponse>({
    queryKey: ['business'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/business/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch business');
      return res.json();
    },
    enabled: !!token
  });

  const { data: services = [], isLoading } = useQuery<ServiceResponse[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/services/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    },
    enabled: !!token
  });

  const startAdd = () => {
    setSelectedService(null);
    setIsDrawerOpen(true);
  };

  const startEdit = (service: ServiceResponse) => {
    setSelectedService(service);
    setIsDrawerOpen(true);
  };

  const handleDrawerSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    onMessage({ type: 'success', text: `Service operation completed successfully!` });
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-gray-400 font-medium">Loading catalog...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
        </div>
        <button 
          onClick={startAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus size={18} />
          Add Service
        </button>
      </div>

      <div className="space-y-6">
        {services.length === 0 && (
          <div className="py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Scissors size={40} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No services found</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Add your first service to start booking client appointments.</p>
            <button 
              onClick={startAdd}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              <Plus size={20} />
              Create First Service
            </button>
          </div>
        )}
        {services.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc: ServiceResponse) => (
              <div key={svc.id} className="group relative bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col justify-between h-48">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center border shadow-sm">
                      <Scissors size={18} />
                    </div>
                    
                    <button 
                      onClick={() => startEdit(svc)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mt-4 leading-tight truncate">{svc.name}</h3>
                  {svc.description && (
                    <p className="text-xs text-gray-400 font-medium mt-1 line-clamp-2 leading-relaxed">{svc.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                  <span className="flex items-center gap-1 text-xs text-gray-500 font-semibold bg-gray-50 px-2.5 py-1 rounded-lg">
                    <Clock size={12} className="text-gray-400" /> {svc.duration_minutes} min
                  </span>
                  {svc.price && (
                    <span className="text-sm font-black text-green-600">
                      ${parseFloat(svc.price).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ServiceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleDrawerSuccess}
        token={token}
        business={business}
        service={selectedService}
      />
    </div>
  );
}
