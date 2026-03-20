'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Calendar, MessageSquare, CheckCircle2, XCircle, RefreshCw, Save, User as UserIcon, Lock, Trash2, Send, Loader2 } from 'lucide-react';
import WhatsAppModal from '@/components/WhatsAppModal';
import TelegramModal from '@/components/TelegramModal';
import { API_BASE_URL } from '@/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Monterrey', label: 'Monterrey' },
  { value: 'America/Tijuana', label: 'Tijuana' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Denver', label: 'Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
  { value: 'America/Bogota', label: 'Bogotá' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
];

interface SettingsContentProps {
  initialBusiness: any;
  initialUser: any;
  token: string | null;
}

export default function SettingsContent({ initialBusiness, initialUser, token }: SettingsContentProps) {
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

  const [isSyncing, setIsSyncing] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Edit states - sync with query data when it changes
  const [editBusiness, setEditBusiness] = useState({ 
    name: business?.name || '', 
    category: business?.category || '', 
    contact_phone: business?.contact_phone || '', 
    timezone: business?.timezone || 'UTC' 
  });
  
  const [editUser, setEditUser] = useState({ 
    email: user?.email || '', 
    password: '' 
  });
  
  const [editAssistant, setEditAssistant] = useState({ 
    name: business?.assistant_config?.name || '', 
    tone: business?.assistant_config?.tone || 'Professional', 
    greeting: business?.assistant_config?.greeting || '', 
    personalized_greeting: business?.assistant_config?.personalized_greeting || '', 
    logic_template: business?.assistant_config?.logic_template || 'standard',
    custom_steps: business?.assistant_config?.custom_steps || '',
    require_reason: business?.assistant_config?.require_reason ?? true,
    confirm_details: business?.assistant_config?.confirm_details ?? true,
    strict_guardrails: business?.assistant_config?.strict_guardrails ?? true
  });

  // Keep edit states in sync when business data is refetched
  useEffect(() => {
    if (business) {
      setEditBusiness({
        name: business.name,
        category: business.category || '',
        contact_phone: business.contact_phone || '',
        timezone: business.timezone || 'UTC'
      });
      if (business.assistant_config) {
        setEditAssistant({
          name: business.assistant_config.name,
          tone: business.assistant_config.tone,
          greeting: business.assistant_config.greeting,
          personalized_greeting: business.assistant_config.personalized_greeting || '',
          logic_template: business.assistant_config.logic_template || 'standard',
          custom_steps: business.assistant_config.custom_steps || '',
          require_reason: business.assistant_config.require_reason ?? true,
          confirm_details: business.assistant_config.confirm_details ?? true,
          strict_guardrails: business.assistant_config.strict_guardrails ?? true
        });
      }
    }
  }, [business]);

  useEffect(() => {
    if (user) {
      setEditUser({ email: user.email, password: '' });
    }
  }, [user]);

  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingAssistant, setSavingAssistant] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Sandbox State
  const [sandboxMessages, setSandboxMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [sandboxInput, setSandboxInput] = useState('');
  const [isSandboxLoading, setIsSandboxLoading] = useState(false);

  const handleTestChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxInput.trim() || isSandboxLoading) return;

    const newUserMessage = { role: 'user' as const, content: sandboxInput };
    setSandboxMessages([...sandboxMessages, newUserMessage]);
    setSandboxInput('');
    setIsSandboxLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/business/test-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: sandboxInput,
          assistant_config: editAssistant
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSandboxMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (err) {
      setSandboxMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not connect to the AI service." }]);
    } finally {
      setIsSandboxLoading(false);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBusiness(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/business/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editBusiness)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Business profile updated successfully!' });
        queryClient.invalidateQueries({ queryKey: ['business'] });
      } else {
        throw new Error('Failed to update business profile');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleSaveAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAssistant(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/business/me/assistant`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editAssistant)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Assistant configuration updated successfully!' });
        queryClient.invalidateQueries({ queryKey: ['business'] });
      } else {
        throw new Error('Failed to update assistant configuration');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingAssistant(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    setMessage({ type: '', text: '' });
    try {
      const body: any = { email: editUser.email };
      if (editUser.password) body.password = editUser.password;

      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Account settings updated successfully!' });
        setEditUser(prev => ({ ...prev, password: '' }));
        queryClient.invalidateQueries({ queryKey: ['user'] });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to update account settings');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingUser(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/google/authorize`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.open(data.authorization_url, 'Connect Google Calendar', 'width=600,height=700');
      }
    } catch (err) {
      console.error('Failed to initiate Google connection', err);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}? This will also clear your local cache.`)) return;
    
    setIsDisconnecting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/integrations/${provider}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `${provider} disconnected successfully.` });
        queryClient.invalidateQueries({ queryKey: ['business'] });
      } else {
        throw new Error(`Failed to disconnect ${provider}`);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE_URL}/integrations/google/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['business'] });
        setIsSyncing(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsSyncing(false);
    }
  };

  const isGoogleConnected = business?.integrations?.some((i: any) => i.provider === 'google');

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          {isFetchingBiz && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>
        {message.text && (
          <div className={`px-4 py-2 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="grid gap-8 max-w-4xl">
        {/* Business Section */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-50 pb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <SettingsIcon size={22} />
            </div>
            <h2>Business Profile</h2>
          </div>
          
          <form onSubmit={handleSaveBusiness} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Business Name</label>
                <input 
                  type="text"
                  value={editBusiness.name}
                  onChange={e => setEditBusiness({...editBusiness, name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Category</label>
                <input 
                  type="text"
                  value={editBusiness.category}
                  onChange={e => setEditBusiness({...editBusiness, category: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. Beauty, Health"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Phone</label>
                <input 
                  type="text"
                  value={editBusiness.contact_phone}
                  onChange={e => setEditBusiness({...editBusiness, contact_phone: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Timezone</label>
                <select 
                  value={editBusiness.timezone}
                  onChange={e => setEditBusiness({...editBusiness, timezone: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Trial Status</label>
                <div className="p-3 bg-green-50 text-green-700 rounded-xl border border-green-100 font-bold">
                  30 Days Remaining
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={savingBusiness}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save size={18} />
                {savingBusiness ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </section>

        {/* Assistant Section */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-50 pb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <MessageSquare size={22} />
            </div>
            <h2>Assistant Behavior</h2>
          </div>
          
          <form onSubmit={handleSaveAssistant} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Assistant Name</label>
                <input 
                  type="text"
                  value={editAssistant.name}
                  onChange={e => setEditAssistant({...editAssistant, name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Tone</label>
                <select 
                  value={editAssistant.tone}
                  onChange={e => setEditAssistant({...editAssistant, tone: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Direct">Direct</option>
                </select>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Standard Greeting</label>
                <textarea 
                  value={editAssistant.greeting}
                  onChange={e => setEditAssistant({...editAssistant, greeting: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
                  placeholder="Hello! How can I help you today?"
                />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Personalized Greeting (for known clients)</label>
                <textarea 
                  value={editAssistant.personalized_greeting}
                  onChange={e => setEditAssistant({...editAssistant, personalized_greeting: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
                  placeholder="Hola {name}, ¿en qué puedo ayudarte hoy?"
                />
                <p className="text-[10px] text-gray-400 mt-1 italic">Use {'{name}'} as a placeholder for the client's first name.</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Logic Template</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setEditAssistant({...editAssistant, logic_template: 'standard'})}
                    className={`flex-1 p-3 rounded-xl border font-bold text-sm transition-all ${
                      editAssistant.logic_template === 'standard' 
                      ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAssistant({...editAssistant, logic_template: 'custom_steps'})}
                    className={`flex-1 p-3 rounded-xl border font-bold text-sm transition-all ${
                      editAssistant.logic_template === 'custom_steps' 
                      ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Custom Steps
                  </button>
                </div>
              </div>

              {editAssistant.logic_template === 'custom_steps' && (
                <div className="col-span-1 md:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Custom Steps / Instructions</label>
                  <textarea 
                    value={editAssistant.custom_steps}
                    onChange={e => setEditAssistant({...editAssistant, custom_steps: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[120px]"
                    placeholder="e.g. 1. Greet the user. 2. Ask for their pet's name..."
                  />
                </div>
              )}

              {/* Behavioral Controls */}
              <div className="space-y-4 col-span-1 md:col-span-2 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mt-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Behavioral Controls</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={editAssistant.require_reason}
                      onChange={e => setEditAssistant({...editAssistant, require_reason: e.target.checked})}
                      className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Require Reason</span>
                      <span className="text-[10px] text-gray-400">Ask why they are booking</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={editAssistant.confirm_details}
                      onChange={e => setEditAssistant({...editAssistant, confirm_details: e.target.checked})}
                      className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Confirm Details</span>
                      <span className="text-[10px] text-gray-400">Verify contact info first</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={editAssistant.strict_guardrails}
                      onChange={e => setEditAssistant({...editAssistant, strict_guardrails: e.target.checked})}
                      className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Strict Guardrails</span>
                      <span className="text-[10px] text-gray-400">Prevent off-topic chat</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={savingAssistant}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save size={18} />
                {savingAssistant ? 'Saving...' : 'Update Assistant'}
              </button>
            </div>
          </form>

          {/* Sandbox Section */}
          <div className="mt-12 bg-gray-50/80 rounded-[2.5rem] border border-gray-100 p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Live Test Sandbox</h3>
                  <p className="text-xs text-gray-400 font-medium">Preview behavior with your current settings above</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSandboxMessages([])}
                className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
              >
                Clear Chat
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 h-[400px] flex flex-col shadow-sm overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {sandboxMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                    <MessageSquare size={48} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-500 max-w-[200px]">Send a message to test how your assistant responds.</p>
                  </div>
                )}
                {sandboxMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-medium ${
                      m.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-700 rounded-bl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isSandboxLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-400 px-4 py-3 rounded-2xl rounded-bl-none text-sm animate-pulse font-medium">
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-gray-50/50 border-t border-gray-50 flex gap-2">
                <input 
                  type="text"
                  value={sandboxInput}
                  onChange={e => setSandboxInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleTestChat(e as any))}
                  placeholder="Type a message to test..."
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
                <button 
                  type="button"
                  onClick={handleTestChat}
                  disabled={isSandboxLoading || !sandboxInput.trim()}
                  className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-90"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-50 pb-6">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <UserIcon size={22} />
            </div>
            <h2>Account Settings</h2>
          </div>
          
          <form onSubmit={handleSaveUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email"
                  value={editUser.email}
                  onChange={e => setEditUser({...editUser, email: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={editUser.password}
                    onChange={e => setEditUser({...editUser, password: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-10"
                    placeholder="Leave blank to keep current"
                  />
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={savingUser}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Save size={18} />
                {savingUser ? 'Saving...' : 'Update Account'}
              </button>
            </div>
          </form>
        </section>

        {/* Integrations Section */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900 border-b border-gray-50 pb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <Calendar size={22} />
            </div>
            <h2>Integrations</h2>
          </div>
          
          <div className="space-y-6">
            {/* Google Calendar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center">
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">Google Calendar</p>
                  <p className="text-sm text-gray-500">Sync availability and appointments.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isGoogleConnected ? (
                  <>
                    <button 
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 size={16} />
                      Connected
                    </span>
                    <button 
                      onClick={() => handleDisconnect('google')}
                      disabled={isDisconnecting}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Disconnect Google Calendar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleGoogleConnect}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    Connect Account
                  </button>
                )}
              </div>
            </div>

            {/* Telegram Bot */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-blue-500">
                  <Send size={28} />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">Telegram Bot</p>
                  <p className="text-sm text-gray-500">Test the AI assistant via Telegram Bot API.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {business?.integrations?.find((i: any) => i.provider === 'telegram') ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-2">
                      <p className="text-sm font-bold text-gray-900">@{business.integrations.find((i: any) => i.provider === 'telegram').settings?.bot_username}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Active Bot</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 size={16} />
                      Connected
                    </span>
                    <button 
                      onClick={() => handleDisconnect('telegram')}
                      disabled={isDisconnecting}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Disconnect Telegram"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsTelegramModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    Connect Bot
                  </button>
                )}
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-green-500">
                  <MessageSquare size={28} />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">WhatsApp Business</p>
                  <p className="text-sm text-gray-500">Automate client messaging via Meta Cloud API.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {business?.integrations?.some((i: any) => i.provider === 'whatsapp') ? (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 size={16} />
                      Connected
                    </span>
                    <button 
                      onClick={() => handleDisconnect('whatsapp')}
                      disabled={isDisconnecting}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Disconnect WhatsApp"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    Connect WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <WhatsAppModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSuccess={() => fetchData()}
        token={token}
      />

      <TelegramModal 
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onSuccess={() => fetchData()}
        token={token}
      />
    </div>
  );
}
