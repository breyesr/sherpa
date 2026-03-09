'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export default function AddAppointmentModal({ isOpen, onClose, onSuccess, token }: AddAppointmentModalProps) {
  const [clientId, setClientId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60'); // minutes
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchClients() {
      if (!isOpen) return;
      try {
        const res = await fetch(`${API_BASE_URL}/crm/clients`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchClients();
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const start = new Date(startTime);
    const end = new Date(start.getTime() + parseInt(duration) * 60000);

    try {
      const res = await fetch(`${API_BASE_URL}/crm/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          client_id: clientId, 
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: 'scheduled'
        })
      });

      if (!res.ok) {
        let errorMessage = 'Failed to create appointment';
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use the status text
          errorMessage = `${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      onSuccess();
      onClose();
      setClientId('');
      setStartTime('');
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach server. Is the backend running?' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold">New Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Client *</label>
            <select 
              required
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Choose a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
            <input 
              required
              type="datetime-local" 
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <select 
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="15">15 mins</option>
              <option value="30">30 mins</option>
              <option value="45">45 mins</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              disabled={loading || !clientId || !startTime}
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
