'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { useDrawer } from '@/lib/store/DrawerManager';
import Drawer from './Drawer';
import { components } from '@/types/api';
import { useTerminology } from '@/hooks/useTerminology';

type ClientResponse = components['schemas']['ClientResponse'];

export default function AppointmentDrawer() {
  const { isOpen, close: onClose } = useDrawer('appointment');
  const token = useAuthStore((state) => state.token);
  const { t } = useTerminology();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60'); // minutes
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!isOpen) return;
      try {
        const [clientsData, storesData] = await Promise.all([
          apiClient.get<ClientResponse[]>('/crm/clients'),
          apiClient.get<any[]>('/trade/stores')
        ]);
        setClients(clientsData);
        setStores(storesData);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [isOpen, token]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setClientId('');
      setStoreId('');
      setCustomerId('');
      setStartTime('');
      setDuration('60');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const start = new Date(startTime);
    const end = new Date(start.getTime() + parseInt(duration) * 60000);

    try {
      await apiClient.post('/crm/appointments', { 
        client_id: clientId || null, 
        store_id: storeId || null,
        customer_id: customerId || null,
        start_time: start.toISOString(),
        end_time: end.toISOString()
      });
      // Invalidate both daily and weekly calendar queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'week'] });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to schedule appointment');
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-3 pt-2">
      <button 
        type="button" 
        onClick={onClose}
        className="flex-1 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all"
      >
        Cancel
      </button>
      <button 
        type="button"
        disabled={loading || !startTime || (!clientId && !customerId)}
        onClick={handleSubmit}
        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        Schedule 
      </button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="New Appointment"
      subtitle="Schedule a meeting or visit"
      footer={footer}
    >
      <form id="appointment-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{`Select ${t('STORE', 'Account')} - Optional`}</label>
            <select 
              className="w-full p-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              <option value="">{`No ${t('STORE', 'Account').toLowerCase()} linked`}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Contact (Retailer) *</label>
            <select 
              required
              className="w-full p-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select a contact...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date & Time *</label>
            <input 
              type="datetime-local" 
              required
              className="w-full p-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-blue-500"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Duration</label>
            <select 
              className="w-full p-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
