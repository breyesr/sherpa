'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Calendar, MessageSquare, Loader2, Scissors, User } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as TabType;
  
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'general');
  const [isDirty, setIsDirty] = useState(false);

  // Unsaved changes browser warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to switch tabs and lose them?')) {
        return;
      }
    }
    
    setIsDirty(false); // Reset dirty state on confirmed switch
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/settings?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (tabParam && ['general', 'assistant', 'services', 'integrations'].includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);
  
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
    if (msg.type === 'success') {
      toast.success(msg.text);
    } else {
      toast.error(msg.text);
    }
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
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-fit border border-gray-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
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
          <GeneralSettings 
            business={business} 
            user={user} 
            token={token} 
            onMessage={handleMessage} 
            onDirtyChange={setIsDirty}
          />
        )}
        {activeTab === 'assistant' && (
          <AssistantSettings 
            business={business} 
            token={token} 
            onMessage={handleMessage} 
            onDirtyChange={setIsDirty}
          />
        )}
        {activeTab === 'services' && (
          <ServiceCatalog 
            token={token} 
            onMessage={handleMessage} 
            onDirtyChange={setIsDirty}
          />
        )}
        {activeTab === 'integrations' && (
          <IntegrationsPanel business={business} token={token} onMessage={handleMessage} />
        )}
      </div>
    </div>
  );
}
