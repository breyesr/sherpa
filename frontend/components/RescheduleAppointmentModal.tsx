'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { API_BASE_URL } from '@/config';

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  appointment: any;
}

export default function RescheduleAppointmentModal({ isOpen, onClose, onSuccess, token, appointment }: RescheduleAppointmentModalProps) {
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60'); // minutes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (appointment && isOpen) {
      // Format start_time for datetime-local input (YYYY-MM-DDThh:mm)
      const date = new Date(appointment.start_time);
      const formatted = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setStartTime(formatted);
      
      const diffMs = new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime();
      setDuration(Math.round(diffMs / 60000).toString());
    }
  }, [appointment, isOpen]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const start = new Date(startTime);
    const end = new Date(start.getTime() + parseInt(duration) * 60000);

    try {
      const res = await fetch(`${API_BASE_URL}/crm/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          start_time: start.toISOString(),
          end_time: end.toISOString()
        })
      });

      if (!res.ok) {
        let errorMessage = 'Failed to reschedule appointment';
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          errorMessage = `${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach server.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-blue-50">
          <h2 className="text-xl font-bold text-blue-900">Reschedule Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white/50 p-1 rounded-full">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
          
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Client</p>
            <p className="font-bold text-gray-900">{appointment.client?.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Start Time *</label>
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
              disabled={loading || !startTime}
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Rescheduling...' : 'Update Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
