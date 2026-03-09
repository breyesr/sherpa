'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  RefreshCw,
  ShieldAlert,
  Edit2,
  Trash2
} from 'lucide-react';
import AddAppointmentModal from '@/components/AddAppointmentModal';
import RescheduleAppointmentModal from '@/components/RescheduleAppointmentModal';
import { API_BASE_URL } from '@/config';

export default function CalendarPage() {
  const token = useAuthStore((state) => state.token);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [aptRes, busyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/crm/appointments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/integrations/google/availability`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (aptRes.ok) setAppointments(await aptRes.json());
      if (busyRes.ok) {
        const data = await busyRes.json();
        setBusySlots(data.busy_slots || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE_URL}/integrations/google/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelAppointment = async (id: str) => {
    if (!confirm('Are you sure you want to cancel this appointment? It will also be removed from Google Calendar.')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/crm/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
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

  const allEvents = [
    ...appointments.map(a => ({ ...a, type: 'appointment' })),
    ...busySlots.map(b => ({ ...b, type: 'google_busy' }))
  ].sort((a, b) => new Date(a.start_time || a.start).getTime() - new Date(b.start_time || b.start).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">Appointments and Google Calendar availability.</p>
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

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : allEvents.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Event / Client</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allEvents.map((event, idx) => {
                const isApt = event.type === 'appointment';
                const start = new Date(event.start_time || event.start);
                const end = new Date(event.end_time || event.end);

                return (
                  <tr key={idx} className={`hover:bg-blue-50/30 transition-colors group ${!isApt ? 'bg-gray-50/20' : ''}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isApt ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isApt ? <User size={18} /> : <ShieldAlert size={18} />}
                        </div>
                        <div>
                          <span className={`font-bold ${isApt ? 'text-gray-900' : 'text-gray-500 italic'}`}>
                            {isApt ? event.client?.name : 'Google Calendar: Busy'}
                          </span>
                          {!isApt && <p className="text-xs text-gray-400">External event</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                          <CalendarIcon size={14} className="text-blue-500" />
                          {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <Clock size={14} />
                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {isApt ? (
                        <div className="flex items-center justify-end gap-2">
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
                      ) : (
                        <span className="text-xs font-bold text-gray-300 uppercase px-4">Blocked</span>
                      )}
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your calendar is empty</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Schedule your first appointment or connect Google Calendar to sync your availability.</p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            Schedule Appointment
          </button>
        </div>
      )}

      <AddAppointmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchData}
        token={token}
      />

      <RescheduleAppointmentModal 
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSuccess={fetchData}
        token={token}
        appointment={selectedAppointment}
      />
    </div>
  );
}
