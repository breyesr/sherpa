'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Calendar, MessageSquare, Loader2, Scissors, User } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import GeneralSettings from './components/GeneralSettings';
import AssistantSettings from './components/AssistantSettings';
import ServiceCatalog from './components/ServiceCatalog';
import IntegrationsPanel from './components/IntegrationsPanel';

interface SettingsContentProps {
  initialBusiness: any;
  initialUser: any;
  token: string | null;
}

type TabType = 'general' | 'assistant' | 'services' | 'integrations';

export default function SettingsContent({ initialBusiness, initialUser, token }: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const queryClient = useQueryClient();
  
  const { data: business = initialBusiness, isFetching: isFetchingBiz } = useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/business/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    initialData: initialBusiness,
    staleTime: 60 * 1000,
  });

  const { data: user = initialUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    initialData: initialUser,
    staleTime: 60 * 1000,
  });

  const handleMessage = (msg: { type: string, text: string }) => {
    setMessage(msg);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
    { id: 'services', label: 'Services', icon: Scissors },
    { id: 'integrations', label: 'Integrations', icon: Calendar },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          {isFetchingBiz && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>
        
        {message.text && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border-green-100' 
              : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-fit border border-gray-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'general' && (
          <GeneralSettings business={business} user={user} token={token} onMessage={handleMessage} />
        )}
        {activeTab === 'assistant' && (
          <AssistantSettings business={business} token={token} onMessage={handleMessage} />
        )}
        {activeTab === 'services' && (
          <ServiceCatalog token={token} onMessage={handleMessage} />
        )}
        {activeTab === 'integrations' && (
          <IntegrationsPanel business={business} token={token} onMessage={handleMessage} />
        )}
      </div>
    </div>
  );
}
