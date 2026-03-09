'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserPlus, Search, Phone, Mail, Calendar, Users } from 'lucide-react';
import AddClientModal from '@/components/AddClientModal';
import { API_BASE_URL } from '@/config';

export default function CRMPage() {
  const token = useAuthStore((state) => state.token);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchClients();
  }, [token]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md hover:shadow-lg active:scale-95"
        >
          <UserPlus size={18} />
          Add Client
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or phone..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
              <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">{client.name}</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                  <div className="w-8 h-8 bg-white border rounded-md flex items-center justify-center text-blue-500 shadow-sm">
                    <Phone size={14} />
                  </div>
                  <span className="font-medium">{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                    <div className="w-8 h-8 bg-white border rounded-md flex items-center justify-center text-blue-500 shadow-sm">
                      <Mail size={14} />
                    </div>
                    <span className="font-medium truncate">{client.email}</span>
                  </div>
                )}
                <button className="w-full flex items-center justify-center gap-2 pt-4 border-t mt-4 text-blue-600 font-bold hover:text-blue-700 transition-colors">
                  <Calendar size={16} />
                  Book Appointment
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={40} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No clients found</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Add your first client to start scheduling appointments and automate reminders.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            <UserPlus size={20} />
            Create First Client
          </button>
        </div>
      )}

      <AddClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchClients}
        token={token}
      />
    </div>
  );
}
