'use client';

import { useState } from 'react';
import { UserPlus, Search, Phone, Mail, Calendar, Users, Edit2, Loader2 } from 'lucide-react';
import ClientModal from '@/components/ClientModal';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config';

interface ClientCRMProps {
  initialClients: any[];
  token: string | null;
}

export default function ClientCRM({ initialClients, token }: ClientCRMProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: clients = [], isFetching } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    },
    initialData: initialClients,
    staleTime: 30 * 1000, // 30 seconds
  });

  const filteredClients = clients.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleEditClient = (client: any) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          {isFetching && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>
        <button 
          onClick={handleAddClient}
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

      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative">
              <button 
                onClick={() => handleEditClient(client)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Edit2 size={18} />
              </button>
              <h3 className="text-xl font-bold text-gray-900 mb-4 pr-8 group-hover:text-blue-600 transition-colors truncate">{client.name}</h3>
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
            onClick={handleAddClient}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            <UserPlus size={20} />
            Create First Client
          </button>
        </div>
      )}

      <ClientModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClient(null);
        }} 
        onSuccess={handleSuccess}
        token={token || ''}
        client={selectedClient}
      />
    </div>
  );
}
