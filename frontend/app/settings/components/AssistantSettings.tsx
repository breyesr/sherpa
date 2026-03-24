'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Save, Loader2, Send } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { useQueryClient } from '@tanstack/react-query';

interface AssistantSettingsProps {
  business: any;
  token: string | null;
  onMessage: (message: { type: string, text: string }) => void;
}

export default function AssistantSettings({ business, token, onMessage }: AssistantSettingsProps) {
  const queryClient = useQueryClient();
  const [savingAssistant, setSavingAssistant] = useState(false);
  
  const [editAssistant, setEditAssistant] = useState({ 
    name: business?.assistant_config?.name || '', 
    tone: business?.assistant_config?.tone || 'Professional', 
    greeting: business?.assistant_config?.greeting || '', 
    personalized_greeting: business?.assistant_config?.personalized_greeting || '', 
    logic_template: business?.assistant_config?.logic_template || 'standard',
    custom_steps: business?.assistant_config?.custom_steps || '',
    require_reason: business?.assistant_config?.require_reason ?? true,
    confirm_details: business?.assistant_config?.confirm_details ?? true,
    strict_guardrails: business?.assistant_config?.strict_guardrails ?? true,
    // Escalation Path
    enable_honesty: business?.assistant_config?.enable_honesty ?? true,
    enable_internal_alert: business?.assistant_config?.enable_internal_alert ?? false,
    enable_lead_capture: business?.assistant_config?.enable_lead_capture ?? true,
    enable_emergency_phone: business?.assistant_config?.enable_emergency_phone ?? false
  });

  const [sandboxMessages, setSandboxMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [sandboxInput, setSandboxInput] = useState('');
  const [isSandboxLoading, setIsSandboxLoading] = useState(false);

  const handleSaveAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAssistant(true);
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
        onMessage({ type: 'success', text: 'Assistant configuration updated successfully!' });
        queryClient.invalidateQueries({ queryKey: ['business'] });
      } else {
        throw new Error('Failed to update assistant configuration');
      }
    } catch (err: any) {
      onMessage({ type: 'error', text: err.message });
    } finally {
      setSavingAssistant(false);
    }
  };

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

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
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
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Tone</label>
              <select 
                value={editAssistant.tone}
                onChange={e => setEditAssistant({...editAssistant, tone: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none"
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
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px] font-medium"
                placeholder="Hello! How can I help you today?"
              />
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
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[120px] font-medium"
                  placeholder="e.g. 1. Greet the user. 2. Ask for their pet's name..."
                />
              </div>
            )}

            {/* Smart Escalation Path */}
            <div className="space-y-4 col-span-1 md:col-span-2 bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100 mt-4">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">Smart Escalation Chain (AI Fallback)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={editAssistant.enable_honesty}
                    onChange={e => setEditAssistant({...editAssistant, enable_honesty: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Admit Ignorance</span>
                    <span className="text-[10px] text-gray-400">AI won't guess unknown info</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={editAssistant.enable_internal_alert}
                    onChange={e => setEditAssistant({...editAssistant, enable_internal_alert: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Flag for Review</span>
                    <span className="text-[10px] text-gray-400">Notify you via dashboard alerts</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={editAssistant.enable_lead_capture}
                    onChange={e => setEditAssistant({...editAssistant, enable_lead_capture: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Take Human Message</span>
                    <span className="text-[10px] text-gray-400">AI offers to leave a note for you</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={editAssistant.enable_emergency_phone}
                    onChange={e => setEditAssistant({...editAssistant, enable_emergency_phone: e.target.checked})}
                    className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Direct Phone Fallback</span>
                    <span className="text-[10px] text-gray-400">Give business phone as last resort</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Standard Behavioral Controls */}
            <div className="space-y-4 col-span-1 md:col-span-2 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mt-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Core Controls</h3>
              
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
                    <span className="text-[10px] text-gray-400">Mandatory booking reason</span>
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
                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Confirm Info</span>
                    <span className="text-[10px] text-gray-400">Verify user details first</span>
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
                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Guardrails</span>
                    <span className="text-[10px] text-gray-400">Strict topic focus</span>
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
              {savingAssistant ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Update Assistant
            </button>
          </div>
        </form>

        {/* Sandbox */}
        <div className="mt-12 bg-gray-50/80 rounded-[2.5rem] border border-gray-100 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Send size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Live Test Sandbox</h3>
                <p className="text-xs text-gray-400 font-medium">Preview behavior with your current settings</p>
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
                  <p className="text-sm font-medium text-gray-500 max-w-[200px]">Send a message to test your assistant.</p>
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
    </div>
  );
}
