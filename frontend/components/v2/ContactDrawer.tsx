'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import Drawer from './Drawer';
import { 
  User, 
  Phone, 
  Mail, 
  Tag, 
  Loader2, 
  AlertCircle,
  MessageSquare,
  Calendar,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { Client } from '@/types/models';

interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  clientId?: string | null; // If provided, we are in Edit Mode
  initialData?: Partial<Client>; // Data passed from list view for instant population
  isProspect?: boolean;
}

export default function ContactDrawer({ isOpen, onClose, token, clientId, initialData, isProspect = false }: ContactDrawerProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isEditing = !!clientId;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    birthday: '',
    gender: '',
    is_prospect: isProspect,
    custom_fields: {
      preferred_comms: 'WhatsApp',
      comm_style: 'Professional'
    }
  });

  // Initialize state when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (!clientId) {
        // Create mode: clear form
        setFormData({
          name: '',
          phone: '',
          email: '',
          role: '',
          birthday: '',
          gender: '',
          is_prospect: isProspect,
          custom_fields: {
            preferred_comms: 'WhatsApp',
            comm_style: 'Professional'
          }
        });
      } else if (initialData) {
        // Edit mode with initial data: populate instantly
        setFormData(prev => ({
          ...prev,
          name: initialData.name || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          role: initialData.role || '',
          birthday: initialData.birthday || '',
          gender: initialData.gender || '',
          is_prospect: initialData.is_prospect ?? isProspect,
          custom_fields: {
            ...prev.custom_fields,
            ...(initialData.custom_fields || {})
          }
        }));
      }
    }
  }, [isOpen, clientId, initialData, isProspect]);

  // Fetch full client data if editing (background sync for missing fields)
  useEffect(() => {
    if (isOpen && clientId) {
      const fetchClient = async () => {
        try {
          const data = await apiClient.get<any>(`/crm/clients/${clientId}`);
          // Only update fields that might not be in initialData
          setFormData(prev => ({
            ...prev,
            name: data.name || prev.name,
            phone: data.phone || prev.phone,
            email: data.email || prev.email,
            role: data.role || prev.role,
            birthday: data.birthday || prev.birthday,
            gender: data.gender || prev.gender,
            is_prospect: data.is_prospect ?? prev.is_prospect,
            custom_fields: {
              preferred_comms: data.custom_fields?.preferred_comms || prev.custom_fields.preferred_comms,
              comm_style: data.custom_fields?.comm_style || prev.custom_fields.comm_style
            }
          }));
        } catch (err) {
          console.error('Failed to fetch contact for background sync', err);
        }
      };
      fetchClient();
    }
  }, [isOpen, clientId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const path = isEditing 
      ? `/crm/clients/${clientId}` 
      : `/crm/clients`;

    // Clean payload: Convert empty strings to null for nullable fields
    const payload = {
      ...formData,
      birthday: formData.birthday || null,
      gender: formData.gender || null,
      phone: formData.phone || null,
      email: formData.email || null,
      role: formData.role || null,
      is_prospect: formData.is_prospect
    };

    try {
      if (isEditing) {
        await apiClient.patch<any>(path, payload);
      } else {
        await apiClient.post<any>(path, payload);
      }

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (clientId) queryClient.invalidateQueries({ queryKey: ['client-detail', clientId] });
      
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-4">
      <button 
        onClick={onClose}
        className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
      >
        Cancel
      </button>
      <button 
        onClick={handleSubmit}
        disabled={loading || !formData.name}
        className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'Save Changes' : 'Add Contact')}
      </button>
    </div>
  );

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? "Edit Contact" : "New Contact"} 
      subtitle={isEditing ? `Editing: ${formData.name || 'Contact'}` : "Add a new decision maker to your network."}
      footer={footer}
      size="wide"
    >
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Core Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <User size={16} className="text-blue-600" />
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest text-blue-600">Core Identity</h4>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <input 
              required
              type="text"
              placeholder="e.g. Maria Test"
              className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900 text-lg"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Job Role / Cargo</label>
              <input 
                type="text"
                placeholder="e.g. Purchasing Manager"
                className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone (Primary)</label>
              <div className="relative">
                <input 
                  type="tel"
                  placeholder="+52..."
                  className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
                <Phone size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <input 
                type="email"
                placeholder="contact@company.com"
                className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
          </div>
        </div>

        {/* Behavioral Context */}
        <div className="p-6 bg-gray-50 rounded-[2rem] space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={16} className="text-orange-500" />
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Behavioral Context</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preferred Channel</label>
              <select 
                className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={formData.custom_fields.preferred_comms}
                onChange={e => setFormData({
                  ...formData, 
                  custom_fields: { ...formData.custom_fields, preferred_comms: e.target.value }
                })}
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telegram">Telegram</option>
                <option value="Email">Email</option>
                <option value="Phone Call">Phone Call</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Communication Style</label>
              <select 
                className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={formData.custom_fields.comm_style}
                onChange={e => setFormData({
                  ...formData, 
                  custom_fields: { ...formData.custom_fields, comm_style: e.target.value }
                })}
              >
                <option value="Professional">Professional</option>
                <option value="Friendly">Friendly</option>
                <option value="Direct / Brief">Direct / Brief</option>
                <option value="Formal">Formal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 mb-2 px-1">
            <Calendar size={16} className="text-gray-400" />
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Personal Profile</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Birthday</label>
              <input 
                type="date"
                className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                value={formData.birthday}
                onChange={e => setFormData({...formData, birthday: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender</label>
              <select 
                className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="">Unspecified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Social Integration Disclaimer */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 italic">
          <MessageSquare size={18} className="text-blue-400 shrink-0" />
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight leading-relaxed">
            Messaging IDs (Telegram/WhatsApp) will be automatically linked upon the first interaction through those channels.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
