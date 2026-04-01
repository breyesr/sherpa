'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  RefreshCw,
  ShieldAlert,
  Edit2,
  Trash2,
  Loader2,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import AddAppointmentModal from '@/components/AddAppointmentModal';
import RescheduleAppointmentModal from '@/components/RescheduleAppointmentModal';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';

interface ClientCalendarProps {
  initialAppointments: any[];
  initialBusySlots: any[];
  token: string | null;
  timezone: string;
}

export default function ClientCalendar({ initialAppointments, initialBusySlots, token, timezone }: ClientCalendarProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({key: 'time', direction: 'asc'});
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: appointments = [], isFetching: isFetchingApts } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/crm/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return res.json();
    },
    initialData: initialAppointments,
    staleTime: 30 * 1000,
  });

  const { data: busySlots = [], isFetching: isFetchingBusy } = useQuery({
    queryKey: ['busy_slots'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/integrations/google/availability`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch availability');
      const data = await res.json();
      return data.busy_slots || [];
    },
    initialData: initialBusySlots,
    staleTime: 30 * 1000,
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE_URL}/integrations/google/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Invalidate and refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['busy_slots'] });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        setIsSyncing(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsSyncing(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment? It will also be removed from Google Calendar.')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/crm/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['busy_slots'] });
      } else {
        alert('Failed to cancel appointment');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRescheduleClick = (apt: any) => {
    setSelectedAppointment(apt);
    setIsRescheduleModalOpen(true);
  };

  // Aggressive Deduplicate
  const googleEventIds = new Set(appointments.map((a: any) => a.google_event_id).filter(Boolean));
  
  // Track appointment times for fallback fuzzy matching (within 1 minute)
  const appointmentTimestamps = appointments.map((a: any) => new Date(a.start_time).getTime());

  const filteredBusySlots = busySlots.filter((b: any) => {
    // 1. Check by ID
    if (googleEventIds.has(b.id)) return false;
    
    // 2. Fuzzy Time Match: If start times are within 60 seconds of each other
    const bStartTime = new Date(b.start).getTime();
    const isDuplicateTime = appointmentTimestamps.some((aptTime: number) => 
      Math.abs(aptTime - bStartTime) < 60000
    );
    
    if (isDuplicateTime) return false;

    return true;
  });

  const now = new Date();

  const allEvents = [
    ...appointments.map((a: any) => ({ ...a, type: 'appointment' })),
    ...filteredBusySlots.map((b: any) => ({ ...b, type: 'google_busy' }))
  ];

  const upcomingEvents = allEvents
    .filter(e => new Date(e.start_time || e.start) >= now)
    .sort((a, b) => new Date(a.start_time || a.start).getTime() - new Date(b.start_time || b.start).getTime());

  const pastEvents = allEvents
    .filter(e => new Date(e.start_time || e.start) < now)
    .sort((a, b) => new Date(b.start_time || b.start).getTime() - new Date(a.start_time || a.start).getTime());

  const applyFiltersAndSort = (events: any[]) => {
    let filtered = events.filter(e => {
      // 1. Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (e.client?.name?.toLowerCase().includes(searchLower)) ||
        (e.service?.name?.toLowerCase().includes(searchLower)) ||
        (e.notes?.toLowerCase().includes(searchLower)) ||
        (e.summary?.toLowerCase().includes(searchLower));

      // 2. Status filter
      const matchesStatus = statusFilter.length === 0 || 
        (e.type === 'appointment' && statusFilter.includes(e.status)) ||
        (e.type === 'google_busy' && statusFilter.includes('busy'));

      return matchesSearch && matchesStatus;
    });

    // 3. Sorting
    return filtered.sort((a, b) => {
      let valA, valB;
      
      if (sortConfig.key === 'time') {
        valA = new Date(a.start_time || a.start).getTime();
        valB = new Date(b.start_time || b.start).getTime();
      } else if (sortConfig.key === 'client') {
        valA = (a.client?.name || a.summary || '').toLowerCase();
        valB = (b.client?.name || b.summary || '').toLowerCase();
      } else if (sortConfig.key === 'status') {
        valA = a.status || 'busy';
        valB = b.status || 'busy';
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const displayedEvents = applyFiltersAndSort(activeTab === 'upcoming' ? upcomingEvents : pastEvents);

  const isGlobalFetching = isFetchingApts || isFetchingBusy || isSyncing;

  // Auto-switch sort direction when changing tabs to maintain Agenda focus
  useEffect(() => {
    setSortConfig({ key: 'time', direction: activeTab === 'upcoming' ? 'asc' : 'desc' });
  }, [activeTab, activeTab]); // Just to be safe with dependencies

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          {isGlobalFetching && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            Refresh Sync
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md hover:shadow-lg active:scale-95"
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>
      </div>

      {/* Agenda Tabs & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'upcoming' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upcoming
            <span className="ml-2 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded-md">
              {upcomingEvents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'past' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Past
            <span className="ml-2 text-[10px] bg-gray-200 px-1.5 py-0.5 rounded-md text-gray-600">
              {pastEvents.length}
            </span>
          </button>
        </div>

        <div className="flex flex-1 w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search clients or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
          
          <div className="relative group">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 cursor-pointer hover:bg-gray-50 transition-all">
              <Filter size={16} />
              Status
              {statusFilter.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {statusFilter.length}
                </span>
              )}
            </div>
            
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {['scheduled', 'confirmed', 'completed', 'cancelled', 'busy'].map(status => (
                <label key={status} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                  <input 
                    type="checkbox"
                    checked={statusFilter.includes(status)}
                    onChange={(e) => {
                      if (e.target.checked) setStatusFilter([...statusFilter, status]);
                      else setStatusFilter(statusFilter.filter(s => s !== status));
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-gray-600 capitalize">{status}</span>
                </label>
              ))}
              {statusFilter.length > 0 && (
                <button 
                  onClick={() => setStatusFilter([])}
                  className="w-full mt-2 pt-2 border-t border-gray-50 text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {displayedEvents.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th 
                  className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors group"
                  onClick={() => setSortConfig({
                    key: 'client',
                    direction: sortConfig.key === 'client' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                >
                  <div className="flex items-center gap-2">
                    Event / Client
                    <ArrowUpDown size={12} className={sortConfig.key === 'client' ? 'text-blue-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'} />
                  </div>
                </th>
                <th 
                  className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors group"
                  onClick={() => setSortConfig({
                    key: 'time',
                    direction: sortConfig.key === 'time' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                >
                  <div className="flex items-center gap-2">
                    Date & Time
                    <ArrowUpDown size={12} className={sortConfig.key === 'time' ? 'text-blue-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'} />
                  </div>
                </th>
                <th 
                  className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors group text-right"
                  onClick={() => setSortConfig({
                    key: 'status',
                    direction: sortConfig.key === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                >
                  <div className="flex items-center justify-end gap-2">
                    Status / Actions
                    <ArrowUpDown size={12} className={sortConfig.key === 'status' ? 'text-blue-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedEvents.map((event, idx) => {
                const isApt = event.type === 'appointment';
                const start = new Date(event.start_time || event.start);
                const end = new Date(event.end_time || event.end);

                return (
                  <tr key={idx} className={`hover:bg-blue-50/30 transition-colors group ${!isApt ? 'bg-gray-50/20' : ''} ${new Date(event.start_time || event.start) < new Date() ? 'opacity-50 grayscale-[0.3]' : ''}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isApt ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isApt ? <User size={18} /> : <ShieldAlert size={18} />}
                        </div>
                        <div>
                          <span className={`font-bold ${isApt ? 'text-gray-900' : 'text-gray-500 italic'}`}>
                            {isApt ? event.client?.name : (event.summary || 'Google Calendar: Busy')}
                          </span>
                          {!isApt && <p className="text-xs text-gray-400">External event</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                          <CalendarIcon size={14} className="text-blue-500" />
                          {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: timezone })}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <Clock size={14} />
                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isApt && (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                            event.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            event.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            event.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-gray-50 text-gray-500 border-gray-100'
                          }`}>
                            {event.status}
                          </span>
                        )}
                        
                        {isApt && new Date(event.start_time) > new Date() ? (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleRescheduleClick(event)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                              title="Reschedule"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleCancelAppointment(event.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                              title="Cancel Appointment"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ) : isApt ? (
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100">Past</span>
                        ) : (
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-4">Blocked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CalendarIcon size={40} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {activeTab === 'upcoming' ? 'Your calendar is empty' : 'No past appointments'}
          </h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            {activeTab === 'upcoming' 
              ? 'Schedule your first appointment or connect Google Calendar to sync your availability.' 
              : 'Historical appointments will appear here once they are completed.'}
          </p>
          {activeTab === 'upcoming' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              <Plus size={20} />
              Schedule Appointment
            </button>
          )}
        </div>
      )}

      <AddAppointmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => router.refresh()}
        token={token || ''}
      />

      <RescheduleAppointmentModal 
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSuccess={() => router.refresh()}
        token={token || ''}
        appointment={selectedAppointment}
      />
    </div>
  );
}
