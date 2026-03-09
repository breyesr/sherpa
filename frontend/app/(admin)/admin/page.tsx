'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, Save, Key, Globe, Brain, Info } from 'lucide-react';
import { API_BASE_URL } from '@/config';

export default function AdminSettingsPage() {
  const token = useAuthStore((state) => state.token);
  const [settings, setSettings] = useState<any>({
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    OPENAI_API_KEY: '',
    GEMINI_API_KEY: '',
    CLAUDE_API_KEY: '',
    ACTIVE_AI_PROVIDER: 'openai', // 'openai', 'gemini', 'claude'
    WHATSAPP_VERIFY_TOKEN: 'sherpa_v1'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        // First check authorization by attempting to fetch
        const res = await fetch(`${API_BASE_URL}/admin/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 403) {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setSettings((prev: any) => ({ ...prev, ...data }));
          setIsAuthorized(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchSettings();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'System settings updated and encrypted successfully!' });
      } else {
        throw new Error('Failed to update system settings. Are you an admin?');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-gray-500 font-bold text-xl h-screen flex items-center justify-center">Authenticating Admin...</div>;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-8 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Access Restricted</h1>
        <p className="text-gray-500 max-w-sm">
          This area is only accessible by authorized administrators. If you believe this is an error, please contact your system administrator.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Sherpa Admin</h1>
          </div>
          <p className="text-gray-500 mt-2 font-medium">Manage global system secrets and configuration.</p>
        </div>
        {message.text && (
          <div className={`px-6 py-3 rounded-2xl text-sm font-bold shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="p-4 bg-orange-50 border-2 border-dashed border-orange-200 rounded-2xl flex gap-4 items-center">
        <Info className="text-orange-500 shrink-0" size={24} />
        <p className="text-sm text-orange-800 leading-relaxed">
          <b>Security Notice:</b> All values entered below are <b>encrypted at rest</b> in the database. 
          Once saved, they are loaded into memory and never exposed to standard users.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-8">
        
        {/* AI Selection & Config */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <Brain size={22} />
            </div>
            <h2>AI Models Strategy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 bg-gray-50 rounded-2xl border border-gray-100">
            {['openai', 'gemini', 'claude'].map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setSettings({...settings, ACTIVE_AI_PROVIDER: provider})}
                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all capitalize ${
                  settings.ACTIVE_AI_PROVIDER === provider 
                  ? 'bg-white text-purple-600 shadow-sm border border-purple-100 scale-[1.02]' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {provider}
              </button>
            ))}
          </div>

          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">OpenAI API Key</label>
              <input 
                type="password"
                value={settings.OPENAI_API_KEY}
                onChange={e => setSettings({...settings, OPENAI_API_KEY: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Google Gemini API Key</label>
              <input 
                type="password"
                value={settings.GEMINI_API_KEY}
                onChange={e => setSettings({...settings, GEMINI_API_KEY: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                placeholder="AIza..."
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Anthropic Claude API Key</label>
              <input 
                type="password"
                value={settings.CLAUDE_API_KEY}
                onChange={e => setSettings({...settings, CLAUDE_API_KEY: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                placeholder="sk-ant-..."
              />
            </div>
          </div>
        </section>

        {/* Google App Config */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Globe size={22} />
            </div>
            <h2>Google Cloud Integration</h2>
          </div>
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Client ID</label>
              <input 
                type="text"
                value={settings.GOOGLE_CLIENT_ID}
                onChange={e => setSettings({...settings, GOOGLE_CLIENT_ID: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                placeholder="2643...apps.googleusercontent.com"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Client Secret</label>
              <input 
                type="password"
                value={settings.GOOGLE_CLIENT_SECRET}
                onChange={e => setSettings({...settings, GOOGLE_CLIENT_SECRET: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                placeholder="GOCSPX-..."
              />
            </div>
          </div>
        </section>

        {/* Meta Config */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <Key size={22} />
            </div>
            <h2>WhatsApp Security</h2>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Global Webhook Verify Token</label>
            <input 
              type="text"
              value={settings.WHATSAPP_VERIFY_TOKEN}
              onChange={e => setSettings({...settings, WHATSAPP_VERIFY_TOKEN: e.target.value})}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
            />
          </div>
        </section>

        <div className="flex justify-end pt-4 pb-12">
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-black text-white px-10 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Encrypting & Saving...' : 'Save Global Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
