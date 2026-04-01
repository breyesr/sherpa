'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, Save, Key, Globe, Brain, Info, Users, Plus, Trash2, Edit2, UserPlus, MessageSquare } from 'lucide-react';
import { API_BASE_URL } from '@/config';

export default function AdminSettingsPage() {
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'users'
  const [settings, setSettings] = useState<any>({
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    GOOGLE_REDIRECT_URI: '',
    FRONTEND_URL: '',
    OPENAI_API_KEY: '',
    GEMINI_API_KEY: '',
    CLAUDE_API_KEY: '',
    ACTIVE_AI_PROVIDER: 'openai',
    WHATSAPP_VERIFY_TOKEN: 'sherpa_v1',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_WHATSAPP_NUMBER: ''
  });
  
  // User Management State
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ email: '', password: '', role: 'member', is_active: true });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Fetch Settings
        const settingsRes = await fetch(`${API_BASE_URL}/admin/settings`, { headers });
        if (settingsRes.status === 403) {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }
        
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings((prev: any) => ({ ...prev, ...data }));
          setIsAuthorized(true);
        }

        } catch (err) {

        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchData();
  }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUsers(userData);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && isAuthorized) {
      fetchUsers();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
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
        setMessage({ type: 'success', text: 'System settings updated successfully!' });
      } else {
        throw new Error('Failed to update system settings.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingUser ? `${API_BASE_URL}/admin/users/${editingUser.id}` : `${API_BASE_URL}/admin/users`;
      const method = editingUser ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        if (editingUser) {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
        } else {
          setUsers(prev => [...prev, updatedUser]);
        }
        setShowUserModal(false);
        setEditingUser(null);
        setUserForm({ email: '', password: '', role: 'member', is_active: true });
        setMessage({ type: 'success', text: `User ${editingUser ? 'updated' : 'created'} successfully!` });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        setMessage({ type: 'success', text: 'User deleted successfully!' });
      }
    } catch (err) {
      console.error(err);
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
        <p className="text-gray-500 max-w-sm">Admin privileges required.</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Sherpa Admin</h1>
          </div>
          <p className="text-gray-500 mt-2 font-medium">System configuration and user management.</p>
        </div>
        {message.text && (
          <div className={`px-6 py-3 rounded-2xl text-sm font-bold shadow-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe size={18} />
          System Settings
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={18} />
          User Management
        </button>
      </div>

      {activeTab === 'settings' ? (
        <form onSubmit={handleSaveSettings} className="grid gap-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 bg-orange-50 border-2 border-dashed border-orange-200 rounded-2xl flex gap-4 items-center">
            <Info className="text-orange-500 shrink-0" size={24} />
            <p className="text-sm text-orange-800"><b>Security Notice:</b> Sensitive values are encrypted at rest.</p>
          </div>

          {/* General App Settings */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Globe className="text-blue-600" /> General App Settings</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Main Website URL (Frontend)</label>
                <input 
                  type="text" 
                  value={settings.FRONTEND_URL} 
                  onChange={e => setSettings({...settings, FRONTEND_URL: e.target.value})} 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="https://web-staging-794a.up.railway.app" 
                />
                <p className="text-[10px] text-gray-400 italic mt-1">Used for OAuth redirects back to the frontend.</p>
              </div>
            </div>
          </section>
          
          {/* AI Settings Section */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
              <Brain className="text-purple-600" />
              <h2>AI Models Strategy</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 bg-gray-50 rounded-2xl">
              {['openai', 'gemini', 'claude'].map((p) => (
                <button
                  key={p} type="button"
                  onClick={() => setSettings({...settings, ACTIVE_AI_PROVIDER: p})}
                  className={`py-2 rounded-xl font-bold text-sm capitalize ${settings.ACTIVE_AI_PROVIDER === p ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="grid gap-4">
              <input type="password" value={settings.OPENAI_API_KEY} onChange={e => setSettings({...settings, OPENAI_API_KEY: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="OpenAI Key" />
              <input type="password" value={settings.GEMINI_API_KEY} onChange={e => setSettings({...settings, GEMINI_API_KEY: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="Gemini Key" />
              <input type="password" value={settings.CLAUDE_API_KEY} onChange={e => setSettings({...settings, CLAUDE_API_KEY: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="Claude Key" />
            </div>
          </section>

          {/* Twilio Platform Section */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
              <MessageSquare className="text-red-600" />
              <h2>Twilio Platform (ISV Model)</h2>
            </div>
            <p className="text-sm text-gray-500">Configure the master Twilio account that will power all business numbers.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Account SID</label>
                <input 
                  type="text" 
                  value={settings.TWILIO_ACCOUNT_SID} 
                  onChange={e => setSettings({...settings, TWILIO_ACCOUNT_SID: e.target.value})} 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500 outline-none" 
                  placeholder="AC..." 
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Auth Token</label>
                <input 
                  type="password" 
                  value={settings.TWILIO_AUTH_TOKEN} 
                  onChange={e => setSettings({...settings, TWILIO_AUTH_TOKEN: e.target.value})} 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none" 
                  placeholder="••••••••" 
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Master WhatsApp Number (Sandbox/Production)</label>
                <input 
                  type="text" 
                  value={settings.TWILIO_WHATSAPP_NUMBER} 
                  onChange={e => setSettings({...settings, TWILIO_WHATSAPP_NUMBER: e.target.value})} 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500 outline-none" 
                  placeholder="14155238886" 
                />
                <p className="text-[10px] text-gray-400 italic mt-1">Numbers only, no plus sign. Used for sandbox routing and default identification.</p>
              </div>
            </div>
          </section>

          {/* Google & WhatsApp Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white rounded-3xl border p-8 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Globe className="text-blue-600" /> Google Cloud</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Client ID</label>
                  <input type="text" value={settings.GOOGLE_CLIENT_ID} onChange={e => setSettings({...settings, GOOGLE_CLIENT_ID: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl text-sm" placeholder="Client ID" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Client Secret</label>
                  <input type="password" value={settings.GOOGLE_CLIENT_SECRET} onChange={e => setSettings({...settings, GOOGLE_CLIENT_SECRET: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl text-sm" placeholder="Client Secret" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Redirect URI</label>
                  <input type="text" value={settings.GOOGLE_REDIRECT_URI} onChange={e => setSettings({...settings, GOOGLE_REDIRECT_URI: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl text-xs font-mono" placeholder="https://api.../api/v1/integrations/google/callback" />
                </div>
              </div>
            </section>
            <section className="bg-white rounded-3xl border p-8 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Key className="text-green-600" /> WhatsApp</h2>
              <input type="text" value={settings.WHATSAPP_VERIFY_TOKEN} onChange={e => setSettings({...settings, WHATSAPP_VERIFY_TOKEN: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl text-sm" placeholder="Verify Token" />
            </section>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 shadow-lg flex items-center gap-2">
              <Save size={20} /> Save Settings
            </button>
          </div>
        </form>
      ) : (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Manage Users</h2>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserForm({ email: '', password: '', role: 'member', is_active: true });
                setShowUserModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <UserPlus size={18} />
              Add New User
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-400 font-mono">{user.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {(user.role || 'member').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`w-3 h-3 rounded-full inline-block mr-2 ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium">{user.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setUserForm({ email: user.email, password: '', role: user.role, is_active: user.is_active });
                          setShowUserModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <input
                  type="email" required
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {editingUser ? 'New Password (Optional)' : 'Password'}
                </label>
                <input
                  type="password" required={!editingUser}
                  value={userForm.password}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Role</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Status</label>
                  <select
                    value={userForm.is_active ? 'true' : 'false'}
                    onChange={e => setUserForm({...userForm, is_active: e.target.value === 'true'})}
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-6 py-3 border rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
